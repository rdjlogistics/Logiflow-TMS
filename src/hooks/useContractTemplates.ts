import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  description: string | null;
  content_html: string | null;
  fields_schema: Json | null;
  is_active: boolean;
  is_system_template: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface MergeField {
  key: string;
  label: string;
  category: string;
  description?: string;
}

// Available merge fields organized by category
export const MERGE_FIELDS: MergeField[] = [
  // Company fields
  { key: 'company_name', label: 'Bedrijfsnaam', category: 'Bedrijf', description: 'Naam van uw bedrijf' },
  { key: 'company_address', label: 'Bedrijfsadres', category: 'Bedrijf', description: 'Volledig adres' },
  { key: 'company_city', label: 'Plaats', category: 'Bedrijf' },
  { key: 'company_postal_code', label: 'Postcode', category: 'Bedrijf' },
  { key: 'company_country', label: 'Land', category: 'Bedrijf' },
  { key: 'company_phone', label: 'Telefoonnummer', category: 'Bedrijf' },
  { key: 'company_email', label: 'E-mailadres', category: 'Bedrijf' },
  { key: 'company_vat_number', label: 'BTW-nummer', category: 'Bedrijf' },
  { key: 'company_kvk_number', label: 'KvK-nummer', category: 'Bedrijf' },
  { key: 'company_iban', label: 'IBAN', category: 'Bedrijf' },
  { key: 'company_bic', label: 'BIC', category: 'Bedrijf' },
  
  // Driver fields
   { key: 'driver_name', label: 'Eigen chauffeur naam', category: 'Eigen chauffeur', description: 'Volledige naam eigen chauffeur' },
   { key: 'driver_email', label: 'Eigen chauffeur e-mail', category: 'Eigen chauffeur' },
   { key: 'driver_phone', label: 'Eigen chauffeur telefoon', category: 'Eigen chauffeur' },
   { key: 'driver_address', label: 'Eigen chauffeur adres', category: 'Eigen chauffeur' },
  
  // Customer fields
  { key: 'customer_name', label: 'Klantnaam', category: 'Klant', description: 'Naam van de klant' },
  { key: 'customer_company', label: 'Klant bedrijfsnaam', category: 'Klant' },
  { key: 'customer_email', label: 'Klant e-mail', category: 'Klant' },
  { key: 'customer_phone', label: 'Klant telefoon', category: 'Klant' },
  { key: 'customer_address', label: 'Klant adres', category: 'Klant' },
  { key: 'customer_city', label: 'Klant plaats', category: 'Klant' },
  { key: 'customer_vat_number', label: 'Klant BTW-nummer', category: 'Klant' },
  
  // Order fields
  { key: 'order_reference', label: 'Order referentie', category: 'Order', description: 'Unieke order referentie' },
  { key: 'order_date', label: 'Orderdatum', category: 'Order' },
  { key: 'pickup_address', label: 'Ophaaladres', category: 'Order' },
  { key: 'pickup_city', label: 'Ophaalplaats', category: 'Order' },
  { key: 'pickup_date', label: 'Ophaaldatum', category: 'Order' },
  { key: 'pickup_time', label: 'Ophaaltijd', category: 'Order' },
  { key: 'delivery_address', label: 'Afleveradres', category: 'Order' },
  { key: 'delivery_city', label: 'Afleverplaats', category: 'Order' },
  { key: 'delivery_date', label: 'Afleverdatum', category: 'Order' },
  { key: 'delivery_time', label: 'Aflevertijd', category: 'Order' },
  { key: 'order_total', label: 'Order totaal', category: 'Order' },
  { key: 'order_notes', label: 'Order opmerkingen', category: 'Order' },
  
  // Contract fields
  { key: 'contract_title', label: 'Contract titel', category: 'Contract' },
  { key: 'contract_date', label: 'Contractdatum', category: 'Contract' },
  { key: 'contract_version', label: 'Contract versie', category: 'Contract' },
  { key: 'effective_date', label: 'Ingangsdatum', category: 'Contract' },
  { key: 'expiry_date', label: 'Vervaldatum', category: 'Contract' },
  
  // Signature fields
  { key: 'signature_date', label: 'Ondertekeningsdatum', category: 'Handtekening' },
  { key: 'signature_location', label: 'Ondertekeningslocatie', category: 'Handtekening' },
  { key: 'signatory_name', label: 'Naam ondertekenaar', category: 'Handtekening' },
  { key: 'signatory_title', label: 'Functie ondertekenaar', category: 'Handtekening' },
];

export const TEMPLATE_TYPES = [
  { value: 'driver_contract', label: 'Eigen chauffeur contract' },
  { value: 'customer_agreement', label: 'Klant overeenkomst' },
  { value: 'service_agreement', label: 'Dienstverleningsovereenkomst' },
  { value: 'nda', label: 'Geheimhoudingsverklaring (NDA)' },
  { value: 'transport_order', label: 'Transportopdracht' },
  { value: 'rate_confirmation', label: 'Tariefbevestiging' },
  { value: 'other', label: 'Overig' },
];

export function useContractTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Fout',
        description: 'Kon sjablonen niet laden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (template: Partial<ContractTemplate>): Promise<ContractTemplate | null> => {
    try {
      setSaving(true);
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('contract_templates')
        .insert({
          name: template.name || 'Nieuw sjabloon',
          type: template.type || 'other',
          description: template.description || null,
          content_html: template.content_html || '<p>Voer hier uw contractinhoud in...</p>',
          fields_schema: template.fields_schema || null,
          is_active: template.is_active ?? true,
          is_system_template: false,
          version: 1,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => [data, ...prev]);
      toast({
        title: 'Sjabloon aangemaakt',
        description: 'Het nieuwe sjabloon is succesvol aangemaakt.',
      });
      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Fout',
        description: 'Kon sjabloon niet aanmaken.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = async (id: string, updates: Partial<ContractTemplate>): Promise<boolean> => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('contract_templates')
        .update({
          name: updates.name,
          type: updates.type,
          description: updates.description,
          content_html: updates.content_html,
          fields_schema: updates.fields_schema,
          is_active: updates.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      toast({
        title: 'Sjabloon opgeslagen',
        description: 'Wijzigingen zijn succesvol opgeslagen.',
      });
      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Fout',
        description: 'Kon sjabloon niet opslaan.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({
        title: 'Sjabloon verwijderd',
        description: 'Het sjabloon is succesvol verwijderd.',
      });
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Fout',
        description: 'Kon sjabloon niet verwijderen.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const duplicateTemplate = async (template: ContractTemplate): Promise<ContractTemplate | null> => {
    return createTemplate({
      ...template,
      name: `${template.name} (kopie)`,
      is_system_template: false,
    });
  };

  return {
    templates,
    loading,
    saving,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  };
}
