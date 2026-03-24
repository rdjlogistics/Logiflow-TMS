import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FreightListing {
  id: string;
  tenant_id: string;
  listing_type: 'capacity' | 'load';
  origin_address: string;
  origin_city: string;
  origin_postal_code: string | null;
  origin_country: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_address: string;
  destination_city: string;
  destination_postal_code: string | null;
  destination_country: string;
  destination_lat: number | null;
  destination_lng: number | null;
  pickup_date: string;
  pickup_time_from: string | null;
  pickup_time_until: string | null;
  delivery_date: string | null;
  delivery_time_from: string | null;
  delivery_time_until: string | null;
  vehicle_type: string | null;
  weight_kg: number | null;
  volume_m3: number | null;
  loading_meters: number | null;
  goods_type: string | null;
  special_requirements: string[] | null;
  price_type: 'fixed' | 'negotiable' | 'per_km' | null;
  price_amount: number | null;
  currency: string;
  status: 'active' | 'matched' | 'expired' | 'cancelled';
  expires_at: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    name: string;
    city: string | null;
  };
}

export interface FreightMatch {
  id: string;
  capacity_listing_id: string;
  load_listing_id: string;
  match_score: number;
  route_overlap_km: number | null;
  detour_km: number | null;
  time_compatibility_score: number | null;
  match_reasons: {
    route_overlap?: string;
    time_match?: string;
    vehicle_match?: string;
    price_estimate?: string;
  } | null;
  status: 'suggested' | 'viewed' | 'interested' | 'accepted' | 'rejected';
  created_at: string;
  capacity_listing?: FreightListing;
  load_listing?: FreightListing;
}

export interface FreightBooking {
  id: string;
  match_id: string | null;
  capacity_listing_id: string;
  load_listing_id: string;
  capacity_company_id: string;
  load_company_id: string;
  agreed_price: number;
  currency: string;
  payment_terms: string | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  trip_id: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreateListingInput {
  listing_type: 'capacity' | 'load';
  origin_address: string;
  origin_city: string;
  origin_postal_code?: string;
  origin_country?: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_address: string;
  destination_city: string;
  destination_postal_code?: string;
  destination_country?: string;
  destination_lat?: number;
  destination_lng?: number;
  pickup_date: string;
  pickup_time_from?: string;
  pickup_time_until?: string;
  delivery_date?: string;
  delivery_time_from?: string;
  delivery_time_until?: string;
  vehicle_type?: string;
  weight_kg?: number;
  volume_m3?: number;
  loading_meters?: number;
  goods_type?: string;
  special_requirements?: string[];
  price_type?: 'fixed' | 'negotiable' | 'per_km';
  price_amount?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

export function useFreightListings(filters?: {
  type?: 'capacity' | 'load' | 'all';
  fromCity?: string;
  toCity?: string;
  dateFrom?: string;
  dateTo?: string;
  vehicleType?: string;
  ownOnly?: boolean;
}) {
  return useQuery({
    queryKey: ['freight-listings', filters],
    queryFn: async () => {
      let query = supabase
        .from('freight_listings')
        .select(`
          *,
          company:companies!freight_listings_tenant_id_fkey(id, name, city)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('listing_type', filters.type);
      }
      if (filters?.fromCity) {
        query = query.ilike('origin_city', `%${filters.fromCity}%`);
      }
      if (filters?.toCity) {
        query = query.ilike('destination_city', `%${filters.toCity}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte('pickup_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('pickup_date', filters.dateTo);
      }
      if (filters?.vehicleType) {
        query = query.eq('vehicle_type', filters.vehicleType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FreightListing[];
    },
  });
}

export function useMyListings() {
  return useQuery({
    queryKey: ['my-freight-listings'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: companyData } = await supabase.rpc('get_user_company', {
        p_user_id: userData.user.id,
      });

      if (!companyData) return [];

      const { data, error } = await supabase
        .from('freight_listings')
        .select('*')
        .eq('tenant_id', companyData)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FreightListing[];
    },
  });
}

export function useFreightMatches(listingId?: string) {
  return useQuery({
    queryKey: ['freight-matches', listingId],
    queryFn: async () => {
      let query = supabase
        .from('freight_matches')
        .select(`
          *,
          capacity_listing:freight_listings!freight_matches_capacity_listing_id_fkey(*),
          load_listing:freight_listings!freight_matches_load_listing_id_fkey(*)
        `)
        .order('match_score', { ascending: false });

      if (listingId) {
        query = query.or(`capacity_listing_id.eq.${listingId},load_listing_id.eq.${listingId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FreightMatch[];
    },
    enabled: !!listingId || true,
  });
}

export function useFreightBookings() {
  return useQuery({
    queryKey: ['freight-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freight_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FreightBooking[];
    },
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateListingInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: companyId } = await supabase.rpc('get_user_company', {
        p_user_id: userData.user.id,
      });

      if (!companyId) throw new Error('No company found');

      const { data, error } = await supabase
        .from('freight_listings')
        .insert({
          ...input,
          tenant_id: companyId,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freight-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-freight-listings'] });
      toast({
        title: 'Listing geplaatst',
        description: 'Je listing is succesvol geplaatst op de marketplace.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fout bij plaatsen',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateListingStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FreightListing['status'] }) => {
      const { error } = await supabase
        .from('freight_listings')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freight-listings'] });
      queryClient.invalidateQueries({ queryKey: ['my-freight-listings'] });
    },
  });
}

export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FreightMatch['status'] }) => {
      const { error } = await supabase
        .from('freight_matches')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['freight-matches'] });
      if (variables.status === 'accepted') {
        toast({
          title: 'Match geaccepteerd!',
          description: 'De andere partij wordt op de hoogte gebracht.',
        });
      }
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      match_id?: string;
      capacity_listing_id: string;
      load_listing_id: string;
      capacity_company_id: string;
      load_company_id: string;
      agreed_price: number;
      payment_terms?: string;
    }) => {
      const { data, error } = await supabase
        .from('freight_bookings')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freight-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['freight-listings'] });
      toast({
        title: 'Boeking aangemaakt',
        description: 'De boeking is succesvol aangemaakt.',
      });
    },
  });
}

export function useFindMatches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMatching, setIsMatching] = useState(false);

  const findMatches = useCallback(async (listingId: string) => {
    setIsMatching(true);
    try {
      const { data, error } = await supabase.functions.invoke('freight-matching', {
        body: { listingId },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['freight-matches'] });
      
      toast({
        title: 'AI Matching voltooid',
        description: `${data.matchesFound || 0} potentiële matches gevonden.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Matching mislukt',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsMatching(false);
    }
  }, [queryClient, toast]);

  return { findMatches, isMatching };
}
