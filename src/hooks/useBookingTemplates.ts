import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export interface BookingTemplate {
  id: string;
  tenant_id: string;
  customer_id: string;
  name: string;
  payload_json: Json;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  tenant_id: string;
  customer_id: string;
  name: string;
  payload_json: Json;
  is_favorite?: boolean;
}

export const useBookingTemplates = (customerId?: string) => {
  const [templates, setTemplates] = useState<BookingTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("booking_templates")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_favorite", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as unknown as BookingTemplate[]);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Fout",
        description: "Kon sjablonen niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [customerId, toast]);

  const createTemplate = async (input: CreateTemplateInput): Promise<BookingTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from("booking_templates")
        .insert(input)
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data as unknown as BookingTemplate, ...prev]);
      toast({
        title: "Sjabloon opgeslagen",
        description: `"${input.name}" is opgeslagen`,
      });
      return data as unknown as BookingTemplate;
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Fout",
        description: "Kon sjabloon niet opslaan",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<CreateTemplateInput>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.payload_json !== undefined) updateData.payload_json = updates.payload_json;
      if (updates.is_favorite !== undefined) updateData.is_favorite = updates.is_favorite;

      const { error } = await supabase
        .from("booking_templates")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      setTemplates(prev =>
        prev.map(t => (t.id === id ? { ...t, ...updates } as BookingTemplate : t))
      );
      return true;
    } catch (error) {
      console.error("Error updating template:", error);
      toast({
        title: "Fout",
        description: "Kon sjabloon niet bijwerken",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("booking_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Sjabloon verwijderd",
      });
      return true;
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Fout",
        description: "Kon sjabloon niet verwijderen",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleFavorite = async (id: string): Promise<boolean> => {
    const template = templates.find(t => t.id === id);
    if (!template) return false;

    const success = await updateTemplate(id, { is_favorite: !template.is_favorite });
    if (success) {
      setTemplates(prev =>
        prev.map(t => (t.id === id ? { ...t, is_favorite: !t.is_favorite } : t))
      );
    }
    return success;
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    favorites: templates.filter(t => t.is_favorite),
  };
};
