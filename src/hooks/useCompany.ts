import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface Company {
  id: string;
  name: string;
  slug: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  kvk_number: string | null;
  vat_number: string | null;
  iban: string | null;
  bic: string | null;
  logo_url: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  is_primary: boolean;
  created_at: string;
  company?: Company;
}

interface CompanyData {
  company: Company | null;
  userCompanies: UserCompany[];
}

async function fetchUserCompanyData(userId: string): Promise<CompanyData> {
  const { data: memberships, error } = await supabase
    .from('user_companies')
    .select(`
      *,
      company:companies(*)
    `)
    .eq('user_id', userId);

  if (error) throw error;

  if (!memberships || memberships.length === 0) {
    return { company: null, userCompanies: [] };
  }

  const userCompanies = memberships as unknown as UserCompany[];
  const primary = memberships.find(m => m.is_primary);
  const company = (primary?.company ?? memberships[0]?.company ?? null) as unknown as Company | null;

  return { company, userCompanies };
}

export const useCompany = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['user-company', user?.id];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchUserCompanyData(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,    // 5 min — shared across 61+ components
    gcTime: 10 * 60 * 1000,
  });

  const company = data?.company ?? null;
  const userCompanies = data?.userCompanies ?? [];

  const createCompany = useCallback(async (companyData: Partial<Company>): Promise<Company | null> => {
    if (!user) return null;

    try {
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyData.name || 'Mijn Bedrijf',
          email: companyData.email,
          phone: companyData.phone,
          address: companyData.address,
          postal_code: companyData.postal_code,
          city: companyData.city,
          country: companyData.country || 'Nederland',
          kvk_number: companyData.kvk_number,
          vat_number: companyData.vat_number,
          iban: companyData.iban,
          bic: companyData.bic,
          logo_url: companyData.logo_url,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      const { error: linkError } = await supabase
        .from('user_companies')
        .insert({
          user_id: user.id,
          company_id: newCompany.id,
          is_primary: true,
        });

      if (linkError) throw linkError;

      queryClient.invalidateQueries({ queryKey });
      return newCompany as Company;
    } catch (err) {
      console.error('Error creating company:', err);
      return null;
    }
  }, [user, queryClient, queryKey]);

  const updateCompany = useCallback(async (updates: Partial<Company>): Promise<boolean> => {
    if (!company) return false;

    try {
      const { settings, ...safeUpdates } = updates;
      const { error } = await supabase
        .from('companies')
        .update(safeUpdates as any)
        .eq('id', company.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey });
      return true;
    } catch (err) {
      console.error('Error updating company:', err);
      return false;
    }
  }, [company, queryClient, queryKey]);

  const switchCompany = useCallback((companyId: string) => {
    if (!data) return;
    const membership = data.userCompanies.find(m => m.company_id === companyId);
    if (membership?.company) {
      queryClient.setQueryData(queryKey, {
        ...data,
        company: membership.company,
      });
    }
  }, [data, queryClient, queryKey]);

  return {
    company,
    userCompanies,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    createCompany,
    updateCompany,
    switchCompany,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
};
