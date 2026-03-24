import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SaveThemeParams {
  theme_preset?: string;
  theme_mode?: string;
}

export const useSaveTenantTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveThemeParams) => {
      // Get the current tenant settings row
      const { data: existing, error: fetchError } = await supabase
        .from('tenant_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Geen tenant instellingen gevonden');

      const { error } = await supabase
        .from('tenant_settings')
        .update(params)
        .eq('id', existing.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      toast.success('Bedrijfsthema opgeslagen');
    },
    onError: (error: Error) => {
      console.error('Error saving tenant theme:', error);
      toast.error('Fout bij opslaan bedrijfsthema');
    },
  });
};
