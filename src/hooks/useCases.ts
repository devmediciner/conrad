import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Case, ExamType } from '@/types/case';

export function useCases(filters?: { search?: string; examType?: string }) {
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: async () => {
      let query = supabase
        .from('cases')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (filters?.examType && filters.examType !== 'all') {
        query = query.eq('exam_type', filters.examType);
      }
      if (filters?.search) {
        const s = filters.search.trim();
        const cleanId = s.replace(/^#/, '');
        // If numeric, search by case_number
        if (/^\d+$/.test(cleanId)) {
          query = query.eq('case_number', parseInt(cleanId, 10));
        } else if (/^[0-9a-fA-F-]{4,36}$/.test(cleanId)) {
          query = query.or(`id.ilike.%${cleanId}%,clinical_case.ilike.%${s}%`);
        } else {
          query = query.ilike('clinical_case', `%${s}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Case[];
    },
  });
}

export function useAllCases() {
  return useQuery({
    queryKey: ['cases', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Case[];
    },
  });
}

export function useSubmitCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (caseData: {
      images: string[];
      exam_type: ExamType;
      age: number;
      sex: string;
      clinical_case: string;
      diagnosis: string;
      source?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      const { error } = await supabase.from('cases').insert({
        ...caseData,
        submitted_by: user.id,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; images?: string[]; exam_type?: string; age?: number | null; sex?: string | null; clinical_case?: string; diagnosis?: string; source?: string | null; status?: string }) => {
      const { error } = await supabase.from('cases').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useUpdateCaseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('cases').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  });
}

async function compressImage(file: File, maxSizeMB = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // Max dimension 2048px
      const MAX_DIM = 2048;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try progressively lower quality
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Falha ao comprimir imagem'));
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
              quality -= 0.15;
              tryCompress();
            } else {
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadCaseImage(file: File): Promise<string> {
  let uploadFile: File | Blob = file;

  try {
    if (file.size > 2 * 1024 * 1024) {
      uploadFile = await compressImage(file);
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    const { error } = await supabase.storage
      .from('radiology-images')
      .upload(fileName, uploadFile, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error("Erro no storage:", error);
      throw error;
    }

    const { data } = supabase.storage
      .from('radiology-images')
      .getPublicUrl(fileName);

    if (!data?.publicUrl) {
      throw new Error("Falha ao gerar URL pública");
    }

    return data.publicUrl;

  } catch (err) {
    console.error("Upload falhou:", err);

    // 🔥 ESSA LINHA EVITA O BUG DO SITE "MORRER"
    await supabase.auth.refreshSession();

    throw err;
  }
}
