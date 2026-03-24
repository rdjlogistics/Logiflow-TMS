import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface PortalTeamMember {
  id: string;
  tenant_id: string;
  customer_id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InviteTeamMemberData {
  customer_id: string;
  email: string;
  name?: string;
  role?: 'admin' | 'user' | 'viewer';
}

export const usePortalTeamMembers = (customerId?: string) => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['portal-team-members', company?.id, customerId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let queryBuilder = supabase
        .from('portal_user_invitations')
        .select('*')
        .eq('tenant_id', company.id)
        .order('invited_at', { ascending: false });
      
      if (customerId) {
        queryBuilder = queryBuilder.eq('customer_id', customerId);
      }
      
      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id
  });

  const inviteMutation = useMutation({
    mutationFn: async (inviteData: InviteTeamMemberData) => {
      if (!company?.id) throw new Error("Geen bedrijf geselecteerd");
      
      // Check if email already exists for this customer
      const { data: existing } = await supabase
        .from('portal_user_invitations')
        .select('id')
        .eq('tenant_id', company.id)
        .eq('customer_id', inviteData.customer_id)
        .eq('email', inviteData.email)
        .single();
      
      if (existing) {
        throw new Error("Dit e-mailadres is al uitgenodigd voor deze klant.");
      }
      
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('portal_user_invitations')
        .insert({
          tenant_id: company.id,
          customer_id: inviteData.customer_id,
          email: inviteData.email,
          name: inviteData.name || null,
          role: inviteData.role || 'user',
          status: 'pending',
          invited_by: user.user?.id || null,
          invited_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-team-members'] });
      toast({
        title: "Uitnodiging verstuurd",
        description: "De teamgenoot is succesvol uitgenodigd."
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij uitnodigen",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { data, error } = await supabase
        .from('portal_user_invitations')
        .update({ role })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-team-members'] });
      toast({
        title: "Rol bijgewerkt",
        description: "De rol van de gebruiker is succesvol gewijzigd."
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase
        .from('portal_user_invitations')
        .update({ 
          invited_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-team-members'] });
      toast({
        title: "Uitnodiging opnieuw verstuurd",
        description: "De uitnodiging is opnieuw verstuurd."
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij versturen",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('portal_user_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-team-members'] });
      toast({
        title: "Toegang ingetrokken",
        description: "De uitnodiging/toegang is succesvol ingetrokken."
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij intrekken",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    teamMembers: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    inviteMember: inviteMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    resendInvite: resendInviteMutation.mutate,
    revokeMember: revokeMutation.mutate,
    isInviting: inviteMutation.isPending,
    isUpdating: updateRoleMutation.isPending
  };
};
