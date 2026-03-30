import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CustomerLocation {
  id: string;
  tenant_id: string;
  customer_id: string;
  label: string;
  company_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address_line: string;
  house_number: string | null;
  postcode: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  access_notes: string | null;
  default_instructions: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationInput {
  tenant_id: string;
  customer_id: string;
  label: string;
  company_name?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address_line: string;
  house_number?: string;
  postcode: string;
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  access_notes?: string;
  default_instructions?: string;
  is_favorite?: boolean;
}

export const useCustomerLocations = (customerId?: string) => {
  const [locations, setLocations] = useState<CustomerLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLocations = useCallback(async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer_locations")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_favorite", { ascending: false })
        .order("label");

      if (error) throw error;
      setLocations((data || []) as unknown as CustomerLocation[]);
    } catch {
      toast({
        title: "Fout",
        description: "Kon locaties niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [customerId, toast]);

  const createLocation = async (input: CreateLocationInput): Promise<CustomerLocation | null> => {
    try {
      // Duplicate check
      const { data: existing } = await supabase
        .from("customer_locations")
        .select("id, label")
        .eq("customer_id", input.customer_id)
        .eq("address_line", input.address_line)
        .eq("postcode", input.postcode)
        .maybeSingle();

      if (existing) {
        const proceed = window.confirm(
          `Er bestaat al een adres "${existing.label}" met dezelfde straat en postcode. Wil je toch doorgaan?`
        );
        if (!proceed) return null;
      }

      const { data, error } = await supabase
        .from("customer_locations")
        .insert(input)
        .select()
        .single();

      if (error) throw error;

      setLocations(prev => [...prev, data as unknown as CustomerLocation]);
      toast({
        title: "Locatie opgeslagen",
        description: `${input.label} is toegevoegd aan je adresboek`,
      });
      return data as unknown as CustomerLocation;
    } catch {
      toast({
        title: "Fout",
        description: "Kon locatie niet opslaan",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateLocation = async (id: string, updates: Partial<CreateLocationInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("customer_locations")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setLocations(prev =>
        prev.map(loc => (loc.id === id ? { ...loc, ...updates } : loc))
      );
      toast({
        title: "Locatie bijgewerkt",
      });
      return true;
    } catch {
      toast({
        title: "Fout",
        description: "Kon locatie niet bijwerken",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteLocation = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("customer_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setLocations(prev => prev.filter(loc => loc.id !== id));
      toast({
        title: "Locatie verwijderd",
      });
      return true;
    } catch {
      toast({
        title: "Fout",
        description: "Kon locatie niet verwijderen",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleFavorite = async (id: string): Promise<boolean> => {
    const location = locations.find(l => l.id === id);
    if (!location) return false;

    return updateLocation(id, { is_favorite: !location.is_favorite });
  };

  return {
    locations,
    loading,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleFavorite,
    favorites: locations.filter(l => l.is_favorite),
    recent: locations.slice(0, 5),
  };
};
