import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Disease {
  id: string;
  name: string;
}

// --- DOENÇAS ---

export const useDiseases = () => {
  return useQuery({
    queryKey: ['diseases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('diseases').select('*').order('name');
      if (error) throw error;
      return data as Disease[];
    },
  });
};

export const useAddDisease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('diseases').insert([{ name }]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diseases'] }),
  });
};

export const useDeleteDisease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('diseases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diseases'] }),
  });
};