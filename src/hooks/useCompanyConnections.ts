import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany, Company } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface CompanyConnection {
  id: string;
  requesting_company_id: string;
  receiving_company_id: string;
  status: ConnectionStatus;
  requested_at: string;
  responded_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  requesting_company?: Company;
  receiving_company?: Company;
}

export const useCompanyConnections = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { toast } = useToast();
  const [connections, setConnections] = useState<CompanyConnection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CompanyConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!company) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all connections for current company
      const { data, error } = await supabase
        .from('company_connections')
        .select(`
          *,
          requesting_company:companies!company_connections_requesting_company_id_fkey(*),
          receiving_company:companies!company_connections_receiving_company_id_fkey(*)
        `)
        .or(`requesting_company_id.eq.${company.id},receiving_company_id.eq.${company.id}`);

      if (error) throw error;

      const allConnections = (data || []) as unknown as CompanyConnection[];
      
      // Filter accepted connections
      const accepted = allConnections.filter(c => c.status === 'accepted');
      setConnections(accepted);

      // Filter pending requests where we are the receiver
      const pending = allConnections.filter(
        c => c.status === 'pending' && c.receiving_company_id === company.id
      );
      setPendingRequests(pending);
    } catch (err) {
      console.error('Error fetching connections:', err);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Real-time subscription
  useEffect(() => {
    if (!company) return;

    const channel = supabase
      .channel(`company-connections-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_connections',
        },
        () => {
          fetchConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company, fetchConnections]);

  const searchCompanies = async (query: string): Promise<Company[]> => {
    if (!query || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', `%${query}%`)
        .neq('id', company?.id || '')
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;
      return (data || []) as Company[];
    } catch (err) {
      console.error('Error searching companies:', err);
      return [];
    }
  };

  const sendConnectionRequest = async (targetCompanyId: string, notes?: string): Promise<boolean> => {
    if (!company || !user) return false;

    try {
      const { error } = await supabase
        .from('company_connections')
        .insert({
          requesting_company_id: company.id,
          receiving_company_id: targetCompanyId,
          notes,
        });

      if (error) throw error;

      toast({
        title: 'Verzoek verstuurd',
        description: 'Het connectieverzoek is verstuurd naar het andere bedrijf.',
      });

      await fetchConnections();
      return true;
    } catch (err) {
      console.error('Error sending connection request:', err);
      toast({
        title: 'Fout',
        description: 'Kon connectieverzoek niet versturen.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const respondToRequest = async (
    connectionId: string,
    accept: boolean,
    reason?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('company_connections')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString(),
          notes: reason || null,
        })
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: accept ? 'Verbonden' : 'Afgewezen',
        description: accept
          ? 'Je bent nu verbonden met dit bedrijf.'
          : 'Het connectieverzoek is afgewezen.',
      });

      await fetchConnections();
      return true;
    } catch (err) {
      console.error('Error responding to request:', err);
      toast({
        title: 'Fout',
        description: 'Kon niet reageren op het verzoek.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const removeConnection = async (connectionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('company_connections')
        .update({ status: 'blocked' })
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: 'Verbinding verwijderd',
        description: 'De verbinding met dit bedrijf is verwijderd.',
      });

      await fetchConnections();
      return true;
    } catch (err) {
      console.error('Error removing connection:', err);
      toast({
        title: 'Fout',
        description: 'Kon verbinding niet verwijderen.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getConnectedCompanies = (): Company[] => {
    if (!company) return [];
    
    return connections.map(conn => {
      if (conn.requesting_company_id === company.id) {
        return conn.receiving_company;
      }
      return conn.requesting_company;
    }).filter(Boolean) as Company[];
  };

  return {
    connections,
    pendingRequests,
    loading,
    searchCompanies,
    sendConnectionRequest,
    respondToRequest,
    removeConnection,
    getConnectedCompanies,
    refetch: fetchConnections,
  };
};
