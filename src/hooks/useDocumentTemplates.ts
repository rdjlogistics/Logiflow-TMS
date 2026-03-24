import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useToast } from './use-toast';

export type DocumentTemplateType = 'cmr' | 'vrachtbrief' | 'pod' | 'invoice' | 'quote' | 'packing_list' | 'delivery_note';

export interface DocumentTemplate {
  id: string;
  tenant_id: string;
  template_type: DocumentTemplateType;
  name: string;
  content_html: string;
  is_default: boolean;
  is_active: boolean;
  variables_schema: any[];
  created_at: string;
  updated_at: string;
}

export interface GeneratedDocument {
  id: string;
  tenant_id: string;
  template_id: string | null;
  document_type: string;
  reference_type: string;
  reference_id: string;
  file_url: string | null;
  file_name: string | null;
  variables_used: Record<string, any>;
  generated_at: string;
  generated_by: string | null;
  checksum: string | null;
  is_signed: boolean;
  signed_at: string | null;
  signed_by_name: string | null;
}

// Standard variables available for all templates
export const TEMPLATE_VARIABLES = {
  company: [
    { key: '{{company.name}}', label: 'Bedrijfsnaam' },
    { key: '{{company.address}}', label: 'Adres' },
    { key: '{{company.postal_code}}', label: 'Postcode' },
    { key: '{{company.city}}', label: 'Plaats' },
    { key: '{{company.country}}', label: 'Land' },
    { key: '{{company.phone}}', label: 'Telefoon' },
    { key: '{{company.email}}', label: 'E-mail' },
    { key: '{{company.kvk_number}}', label: 'KvK-nummer' },
    { key: '{{company.vat_number}}', label: 'BTW-nummer' },
    { key: '{{company.iban}}', label: 'IBAN' },
  ],
  customer: [
    { key: '{{customer.company_name}}', label: 'Klantnaam' },
    { key: '{{customer.contact_name}}', label: 'Contactpersoon' },
    { key: '{{customer.address}}', label: 'Adres' },
    { key: '{{customer.postal_code}}', label: 'Postcode' },
    { key: '{{customer.city}}', label: 'Plaats' },
    { key: '{{customer.country}}', label: 'Land' },
    { key: '{{customer.email}}', label: 'E-mail' },
    { key: '{{customer.phone}}', label: 'Telefoon' },
    { key: '{{customer.vat_number}}', label: 'BTW-nummer' },
  ],
  order: [
    { key: '{{order.number}}', label: 'Ordernummer' },
    { key: '{{order.date}}', label: 'Orderdatum' },
    { key: '{{order.pickup_address}}', label: 'Ophaaladres' },
    { key: '{{order.pickup_city}}', label: 'Ophaalplaats' },
    { key: '{{order.pickup_date}}', label: 'Ophaaldatum' },
    { key: '{{order.delivery_address}}', label: 'Afleveradres' },
    { key: '{{order.delivery_city}}', label: 'Afleverplaats' },
    { key: '{{order.delivery_date}}', label: 'Afleverdatum' },
    { key: '{{order.reference}}', label: 'Referentie' },
    { key: '{{order.weight}}', label: 'Gewicht (kg)' },
    { key: '{{order.volume}}', label: 'Volume (m³)' },
    { key: '{{order.loading_meters}}', label: 'Laadmeters' },
    { key: '{{order.goods_description}}', label: 'Goederen omschrijving' },
  ],
  driver: [
    { key: '{{driver.name}}', label: 'Chauffeur naam' },
    { key: '{{driver.phone}}', label: 'Chauffeur telefoon' },
    { key: '{{driver.license}}', label: 'Rijbewijs nummer' },
  ],
  vehicle: [
    { key: '{{vehicle.license_plate}}', label: 'Kenteken' },
    { key: '{{vehicle.type}}', label: 'Voertuigtype' },
  ],
  signature: [
    { key: '{{signature.sender}}', label: 'Handtekening afzender' },
    { key: '{{signature.carrier}}', label: 'Handtekening charter' },
    { key: '{{signature.receiver}}', label: 'Handtekening ontvanger' },
    { key: '{{signature.date}}', label: 'Datum ondertekening' },
  ],
};

// Default CMR template
const DEFAULT_CMR_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 5px 0 0; color: #666; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .box { border: 1px solid #333; padding: 10px; }
    .box-header { font-weight: bold; background: #f0f0f0; margin: -10px -10px 10px; padding: 5px 10px; }
    .field { margin-bottom: 8px; }
    .field-label { font-weight: bold; font-size: 10px; color: #666; }
    .field-value { margin-top: 2px; min-height: 16px; }
    .signature-box { height: 60px; border: 1px dashed #999; margin-top: 10px; }
    .footer { margin-top: 20px; font-size: 9px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CMR VRACHTBRIEF</h1>
    <p>Internationaal Vervoerdocument (Conventie van Genève 1956)</p>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-header">1. Afzender</div>
      <div class="field">
        <div class="field-value">{{customer.company_name}}</div>
        <div class="field-value">{{order.pickup_address}}</div>
        <div class="field-value">{{order.pickup_city}}</div>
      </div>
    </div>
    <div class="box">
      <div class="box-header">2. Geadresseerde</div>
      <div class="field">
        <div class="field-value">{{order.delivery_address}}</div>
        <div class="field-value">{{order.delivery_city}}</div>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-header">16. Vervoerder</div>
      <div class="field">
        <div class="field-value">{{company.name}}</div>
        <div class="field-value">{{company.address}}</div>
        <div class="field-value">{{company.postal_code}} {{company.city}}</div>
      </div>
    </div>
    <div class="box">
      <div class="box-header">17. Opeenvolgende vervoerders</div>
      <div class="field">
        <div class="field-value">-</div>
      </div>
    </div>
  </div>

  <div class="box" style="margin-bottom: 15px;">
    <div class="box-header">Goederen omschrijving</div>
    <div class="grid" style="margin: 0;">
      <div>
        <div class="field"><span class="field-label">Merken en nummers:</span> <span class="field-value">{{order.reference}}</span></div>
        <div class="field"><span class="field-label">Aantal colli:</span> <span class="field-value">-</span></div>
        <div class="field"><span class="field-label">Wijze van verpakking:</span> <span class="field-value">-</span></div>
      </div>
      <div>
        <div class="field"><span class="field-label">Aard der goederen:</span> <span class="field-value">{{order.goods_description}}</span></div>
        <div class="field"><span class="field-label">Bruttogewicht (kg):</span> <span class="field-value">{{order.weight}}</span></div>
        <div class="field"><span class="field-label">Volume (m³):</span> <span class="field-value">{{order.volume}}</span></div>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-header">22. Handtekening afzender</div>
      <div class="signature-box">{{signature.sender}}</div>
      <div class="field-label" style="margin-top: 5px;">Datum: {{order.pickup_date}}</div>
    </div>
    <div class="box">
      <div class="box-header">23. Handtekening vervoerder</div>
      <div class="signature-box">{{signature.carrier}}</div>
      <div class="field-label" style="margin-top: 5px;">Chauffeur: {{driver.name}}</div>
    </div>
  </div>

  <div class="box" style="margin-top: 15px;">
    <div class="box-header">24. Handtekening geadresseerde - Ontvangst goederen</div>
    <div class="grid" style="margin: 0;">
      <div class="signature-box">{{signature.receiver}}</div>
      <div>
        <div class="field-label">Datum en tijdstip ontvangst:</div>
        <div class="field-value">{{signature.date}}</div>
        <div class="field-label" style="margin-top: 10px;">Voorbehouden:</div>
        <div class="field-value">-</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Document gegenereerd door {{company.name}} | Ordernummer: {{order.number}}</p>
  </div>
</body>
</html>
`;

export function useDocumentTemplates() {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['document-templates', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('tenant_id', company.id)
        .order('template_type', { ascending: true });
      
      if (error) throw error;
      return data as DocumentTemplate[];
    },
    enabled: !!company?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<DocumentTemplate, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await supabase
        .from('document_templates')
        .insert({ ...template, tenant_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({ title: 'Template aangemaakt', description: 'De documenttemplate is succesvol aangemaakt.' });
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Template kon niet worden aangemaakt.', variant: 'destructive' });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DocumentTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('document_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({ title: 'Template bijgewerkt' });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({ title: 'Template verwijderd' });
    },
  });

  const generateDocument = useCallback(async (
    templateId: string,
    referenceType: 'trip' | 'invoice' | 'order',
    referenceId: string,
    variables: Record<string, any>
  ): Promise<GeneratedDocument | null> => {
    if (!company?.id) return null;

    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Replace variables in template
      let html = template.content_html;
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, String(value ?? ''));
      });

      // Generate PDF via edge function
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-document-pdf', {
        body: { 
          html,
          fileName: `${template.template_type}_${referenceId}.pdf`,
        },
      });

      if (pdfError) throw pdfError;

      // Store generated document record
      const { data: doc, error: docError } = await supabase
        .from('generated_documents')
        .insert({
          tenant_id: company.id,
          template_id: templateId,
          document_type: template.template_type,
          reference_type: referenceType,
          reference_id: referenceId,
          file_url: pdfData?.url || null,
          file_name: `${template.template_type}_${referenceId}.pdf`,
          variables_used: variables,
          generated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      toast({ title: 'Document gegenereerd', description: `${template.name} is succesvol aangemaakt.` });
      return doc as GeneratedDocument;
    } catch (err) {
      console.error('Error generating document:', err);
      toast({ title: 'Fout', description: 'Document kon niet worden gegenereerd.', variant: 'destructive' });
      return null;
    }
  }, [company, templates, toast]);

  const getDefaultCMRTemplate = () => DEFAULT_CMR_TEMPLATE;

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generateDocument,
    getDefaultCMRTemplate,
    TEMPLATE_VARIABLES,
  };
}
