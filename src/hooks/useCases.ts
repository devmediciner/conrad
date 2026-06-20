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
      files: File[];
      laudo_files: File[];
      exam_type: ExamType;
      age: number;
      sex: string;
      clinical_case: string;
      diagnosis: string;
      source?: string;
      author?: string;
      image_source?: string;
      status?: string;
      disease?: string | null;
      clue1?: string | null;
      clue2?: string | null;
      clue3?: string | null;
      comments?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      // 1. Insert case record first with empty images array
      const { data, error } = await supabase
        .from('cases')
        .insert({
          exam_type: caseData.exam_type,
          age: caseData.age,
          sex: caseData.sex,
          clinical_case: caseData.clinical_case,
          diagnosis: caseData.diagnosis,
          source: caseData.source,
          author: caseData.author,
          image_source: caseData.image_source,
          status: 'pending',
          submitted_by: user.id,
          disease: caseData.disease,
          clue1: caseData.clue1,
          clue2: caseData.clue2,
          clue3: caseData.clue3,
          comments: caseData.comments,
          images: [],
          laudo_images: [],
        })
        .select('id, case_number')
        .single();

      if (error) throw error;

      const caseId = data.id;
      const caseNumber = data.case_number;
      const examType = caseData.exam_type.toUpperCase();

      let uploadedUrls: string[] = [];
      let uploadedLaudoUrls: string[] = [];

      try {
        // 2. Upload images directly to the official structured folder path
        if (caseData.files && caseData.files.length > 0) {
          uploadedUrls = await Promise.all(
            caseData.files.map(file => uploadCaseImage(file, examType, caseNumber))
          );
        }

        // 2.1 Upload laudo images
        if (caseData.laudo_files && caseData.laudo_files.length > 0) {
          uploadedLaudoUrls = await Promise.all(
            caseData.laudo_files.map(file => uploadCaseImage(file, examType, caseNumber))
          );
        }

        // 3. Update the case record in the database with the official URLs
        const { error: updateImgError } = await supabase
          .from('cases')
          .update({ 
            images: uploadedUrls,
            laudo_images: uploadedLaudoUrls
          })
          .eq('id', caseId);

        if (updateImgError) throw updateImgError;
      } catch (uploadError) {
        console.error("Erro no upload das imagens do novo caso:", uploadError);
        
        // Cleanup uploaded images on failure
        if (uploadedUrls.length > 0) {
          const fileNames = uploadedUrls
            .map(url => {
              const bucketMarker = '/radiology-images/';
              const idx = url.indexOf(bucketMarker);
              return idx !== -1 ? url.substring(idx + bucketMarker.length) : url.split('/').pop();
            })
            .filter(Boolean) as string[];

          if (fileNames.length > 0) {
            await supabase.storage
              .from('radiology-images')
              .remove(fileNames)
              .catch(e => console.error("Erro ao remover arquivos após falha:", e));
          }
        }

        if (uploadedLaudoUrls.length > 0) {
          const fileNames = uploadedLaudoUrls
            .map(url => {
              const bucketMarker = '/radiology-images/';
              const idx = url.indexOf(bucketMarker);
              return idx !== -1 ? url.substring(idx + bucketMarker.length) : url.split('/').pop();
            })
            .filter(Boolean) as string[];

          if (fileNames.length > 0) {
            await supabase.storage
              .from('radiology-images')
              .remove(fileNames)
              .catch(e => console.error("Erro ao remover arquivos do laudo após falha:", e));
          }
        }

        // Delete the broken case record
        await supabase.from('cases').delete().eq('id', caseId);
        
        throw uploadError;
      }

      // 4. Update status to approved if submitting admin/approved status
      if (caseData.status === 'approved') {
        const { error: updateError } = await supabase
          .from('cases')
          .update({ status: 'approved' })
          .eq('id', caseId);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string; 
      images?: string[]; 
      laudo_images?: string[];
      exam_type?: string; 
      age?: number | null; 
      sex?: string | null; 
      clinical_case?: string; 
      diagnosis?: string; 
      source?: string | null; 
      author?: string | null;
      image_source?: string | null;
      status?: string;
      disease?: string | null;
      clue1?: string | null;
      clue2?: string | null;
      clue3?: string | null;
      comments?: string | null;
    }) => {
      // If updates contain a new images array, clean up removed images from storage
      if (updates.images) {
        const { data: currentCase } = await supabase
          .from('cases')
          .select('images')
          .eq('id', id)
          .single();
        
        if (currentCase?.images) {
          const oldImages = currentCase.images as string[];
          const newImages = updates.images;
          const removedImages = oldImages.filter(url => !newImages.includes(url));
          
          if (removedImages.length > 0) {
            const fileNames = removedImages
              .map(url => {
                const bucketMarker = '/radiology-images/';
                const idx = url.indexOf(bucketMarker);
                return idx !== -1 ? url.substring(idx + bucketMarker.length) : url.split('/').pop();
              })
              .filter(Boolean) as string[];
            
            if (fileNames.length > 0) {
              await supabase.storage
                .from('radiology-images')
                .remove(fileNames);
            }
          }
        }
      }

      // If updates contain a new laudo_images array, clean up removed images from storage
      if (updates.laudo_images) {
        const { data: currentCase } = await supabase
          .from('cases')
          .select('laudo_images')
          .eq('id', id)
          .single();
        
        if (currentCase?.laudo_images) {
          const oldImages = currentCase.laudo_images as string[];
          const newImages = updates.laudo_images;
          const removedImages = oldImages.filter(url => !newImages.includes(url));
          
          if (removedImages.length > 0) {
            const fileNames = removedImages
              .map(url => {
                const bucketMarker = '/radiology-images/';
                const idx = url.indexOf(bucketMarker);
                return idx !== -1 ? url.substring(idx + bucketMarker.length) : url.split('/').pop();
              })
              .filter(Boolean) as string[];
            
            if (fileNames.length > 0) {
              await supabase.storage
                .from('radiology-images')
                .remove(fileNames);
            }
          }
        }
      }

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
      // 1. Fetch case to get images
      const { data: caseData } = await supabase
        .from('cases')
        .select('images, laudo_images')
        .eq('id', id)
        .single();

      // 2. Delete case from DB
      const { error } = await supabase.from('cases').delete().eq('id', id);
      if (error) throw error;

      // 3. Delete images from storage
      if (caseData?.images && caseData.images.length > 0) {
        const fileNames = (caseData.images as string[])
          .map(url => {
            const bucketMarker = '/radiology-images/';
            const idx = url.indexOf(bucketMarker);
            return idx !== -1 ? url.substring(idx + bucketMarker.length) : url.split('/').pop();
          })
          .filter(Boolean) as string[];

        if (fileNames.length > 0) {
          await supabase.storage
            .from('radiology-images')
            .remove(fileNames);
        }
      }

      if (caseData?.laudo_images && caseData.laudo_images.length > 0) {
        const fileNames = (caseData.laudo_images as string[])
          .map(url => {
            const bucketMarker = '/radiology-images/';
            const idx = url.indexOf(bucketMarker);
            return idx !== -1 ? url.substring(idx + bucketMarker.length) : url.split('/').pop();
          })
          .filter(Boolean) as string[];

        if (fileNames.length > 0) {
          await supabase.storage
            .from('radiology-images')
            .remove(fileNames);
        }
      }
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

export async function uploadCaseImage(
  file: File,
  examType: string,
  caseNumber?: number | string
): Promise<string> {
  let uploadFile: File | Blob = file;

  try {
    if (file.size > 2 * 1024 * 1024) {
      uploadFile = await compressImage(file);
    }

    const rawFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    // Structure path: modality/caseNumber/fileName
    // e.g., TC/123/17156382-abc.jpg
    const folderPath = caseNumber 
      ? `${examType.toUpperCase()}/${caseNumber}` 
      : `temp/${examType.toUpperCase()}`;
    const filePath = `${folderPath}/${rawFileName}`;

    const { error } = await supabase.storage
      .from('radiology-images')
      .upload(filePath, uploadFile, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error("Erro no storage:", error);
      throw error;
    }

    const { data } = supabase.storage
      .from('radiology-images')
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("Falha ao gerar URL pública");
    }

    return data.publicUrl;

  } catch (err) {
    console.error("Upload falhou:", err);
    await supabase.auth.refreshSession();
    throw err;
  }
}
