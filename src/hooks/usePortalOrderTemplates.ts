import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PortalOrderTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  recurrence_type: string | null;
  recurrence_days: number[] | null;
  recurrence_day_of_month: number | null;
  next_run_date: string | null;
  last_run_date: string | null;
  pickup_address: string | null;
  pickup_city: string | null;
  pickup_postal_code: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  cargo_description: string | null;
  weight_kg: number | null;
  customer_id: string | null;
  company_id: string | null;
  created_at: string | null;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  customer_id: string;
  company_id: string;
  recurrence_type?: string;
  recurrence_days?: number[];
  recurrence_day_of_month?: number;
  next_run_date?: string;
  pickup_address?: string;
  pickup_city?: string;
  pickup_postal_code?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  cargo_description?: string;
  weight_kg?: number;
  is_active?: boolean;
}

export const usePortalOrderTemplates = (customerId?: string) => {
  const [templates, setTemplates] = useState<PortalOrderTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_templates')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast.error('Kon herhaalorders niet laden');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const createTemplate = async (input: CreateTemplateInput) => {
    try {
      const { data, error } = await supabase
        .from('order_templates')
        .insert({
          name: input.name,
          description: input.description || null,
          customer_id: input.customer_id,
          company_id: input.company_id,
          recurrence_type: input.recurrence_type || 'once',
          recurrence_days: input.recurrence_days || null,
          recurrence_day_of_month: input.recurrence_day_of_month || null,
          next_run_date: input.next_run_date || null,
          pickup_address: input.pickup_address || null,
          pickup_city: input.pickup_city || null,
          pickup_postal_code: input.pickup_postal_code || null,
          delivery_address: input.delivery_address || null,
          delivery_city: input.delivery_city || null,
          delivery_postal_code: input.delivery_postal_code || null,
          cargo_description: input.cargo_description || null,
          weight_kg: input.weight_kg || null,
          is_active: input.is_active ?? true,
          created_by: (await supabase.auth.getUser()).data.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      setTemplates(prev => [data, ...prev]);
      toast.success('Herhaalorder aangemaakt');
      return data;
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Kon herhaalorder niet aanmaken');
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<CreateTemplateInput>) => {
    try {
      const { error } = await supabase
        .from('order_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      toast.success('Herhaalorder bijgewerkt');
      return true;
    } catch (err) {
      console.error('Error updating template:', err);
      toast.error('Kon herhaalorder niet bijwerken');
      return false;
    }
  };

  const toggleActive = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return false;
    return updateTemplate(id, { is_active: !template.is_active });
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('order_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Herhaalorder verwijderd');
      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Kon herhaalorder niet verwijderen');
      return false;
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    toggleActive,
    deleteTemplate,
  };
};
