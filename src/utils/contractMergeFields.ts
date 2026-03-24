import { supabase } from '@/integrations/supabase/client';

export interface MergeFieldData {
  // Company fields
  company_name?: string;
  company_address?: string;
  company_city?: string;
  company_postal_code?: string;
  company_country?: string;
  company_phone?: string;
  company_email?: string;
  company_vat_number?: string;
  company_kvk_number?: string;
  company_iban?: string;
  company_bic?: string;
  
  // Driver fields
  driver_name?: string;
  driver_email?: string;
  driver_phone?: string;
  driver_address?: string;
  
  // Customer fields
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_vat_number?: string;
  
  // Carrier fields
  carrier_name?: string;
  carrier_company?: string;
  carrier_email?: string;
  carrier_phone?: string;
  carrier_address?: string;
  carrier_vat_number?: string;
  
  // Order fields
  order_reference?: string;
  order_date?: string;
  pickup_address?: string;
  pickup_city?: string;
  pickup_date?: string;
  pickup_time?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_date?: string;
  delivery_time?: string;
  order_total?: string;
  order_notes?: string;
  
  // Contract fields
  contract_title?: string;
  contract_date?: string;
  contract_version?: string;
  effective_date?: string;
  expiry_date?: string;
  
  // Signature fields
  signature_date?: string;
  signature_location?: string;
  signatory_name?: string;
  signatory_title?: string;
}

/**
 * Fetch company data for merge fields
 */
export async function fetchCompanyMergeData(): Promise<Partial<MergeFieldData>> {
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .limit(1)
    .single();
  
  if (!company) return {};
  
  return {
    company_name: company.name || '',
    company_address: company.address || '',
    company_city: company.city || '',
    company_postal_code: company.postal_code || '',
    company_country: company.country || '',
    company_phone: company.phone || '',
    company_email: company.email || '',
    company_vat_number: company.vat_number || '',
    company_kvk_number: company.kvk_number || '',
    company_iban: company.iban || '',
    company_bic: company.bic || '',
  };
}

/**
 * Fetch driver data for merge fields
 */
export async function fetchDriverMergeData(driverId: string): Promise<Partial<MergeFieldData>> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('user_id', driverId)
    .single();
  
  if (!profile) return {};
  
  return {
    driver_name: profile.full_name || '',
    driver_phone: profile.phone || '',
    signatory_name: profile.full_name || '',
  };
}

/**
 * Fetch customer data for merge fields
 */
export async function fetchCustomerMergeData(customerId: string): Promise<Partial<MergeFieldData>> {
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();
  
  if (!customer) return {};
  
  return {
    customer_name: customer.contact_name || '',
    customer_company: customer.company_name || '',
    customer_email: customer.email || '',
    customer_phone: customer.phone || '',
    customer_address: customer.address || '',
    customer_city: customer.city || '',
    customer_vat_number: customer.vat_number || '',
    signatory_name: customer.contact_name || customer.company_name || '',
  };
}

/**
 * Fetch carrier data for merge fields
 */
export async function fetchCarrierMergeData(carrierId: string): Promise<Partial<MergeFieldData>> {
  const { data: carrier } = await supabase
    .from('carriers')
    .select('*')
    .eq('id', carrierId)
    .single();
  
  if (!carrier) return {};
  
  return {
    carrier_name: carrier.contact_name || '',
    carrier_company: carrier.company_name || '',
    carrier_email: carrier.email || '',
    carrier_phone: carrier.phone || '',
    carrier_address: carrier.address || '',
    carrier_vat_number: carrier.vat_number || '',
    signatory_name: carrier.contact_name || carrier.company_name || '',
  };
}

/**
 * Fetch order/trip data for merge fields
 */
export async function fetchOrderMergeData(orderId: string): Promise<Partial<MergeFieldData>> {
  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', orderId)
    .single();
  
  if (!trip) return {};
  
  return {
    order_reference: trip.order_number || trip.id.slice(0, 8).toUpperCase(),
    order_date: trip.created_at ? formatDate(trip.created_at) : '',
    pickup_address: trip.pickup_address || '',
    pickup_city: trip.pickup_city || '',
    pickup_date: trip.trip_date ? formatDate(trip.trip_date) : '',
    pickup_time: '', // Not in trips table
    delivery_address: trip.delivery_address || '',
    delivery_city: trip.delivery_city || '',
    delivery_date: trip.trip_date ? formatDate(trip.trip_date) : '', // Same as trip_date
    delivery_time: '', // Not in trips table
    order_total: trip.sales_total ? `€${trip.sales_total.toFixed(2)}` : '',
    order_notes: trip.notes || '',
  };
}

/**
 * Get all merge field data for a contract
 */
export async function getAllMergeFieldData(
  counterpartyType: 'driver' | 'customer' | 'carrier',
  counterpartyId: string,
  orderId?: string
): Promise<MergeFieldData> {
  const today = new Date();
  
  // Parallel fetch all data
  const [companyData, counterpartyData, orderData] = await Promise.all([
    fetchCompanyMergeData(),
    counterpartyType === 'driver' 
      ? fetchDriverMergeData(counterpartyId)
      : counterpartyType === 'customer'
        ? fetchCustomerMergeData(counterpartyId)
        : fetchCarrierMergeData(counterpartyId),
    orderId ? fetchOrderMergeData(orderId) : Promise.resolve({}),
  ]);
  
  return {
    ...companyData,
    ...counterpartyData,
    ...orderData,
    // Contract fields
    contract_date: formatDate(today.toISOString()),
    effective_date: formatDate(today.toISOString()),
    signature_date: formatDate(today.toISOString()),
    contract_version: '1',
  };
}

/**
 * Replace merge fields in content
 */
export function replaceMergeFields(content: string, data: MergeFieldData): string {
  let result = content;
  
  // Replace all {{field_name}} patterns
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  // Clean up any remaining unreplaced merge fields
  result = result.replace(/\{\{[a-z_]+\}\}/g, '');
  
  return result;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Extract merge fields used in content
 */
export function extractMergeFields(content: string): string[] {
  const regex = /\{\{([a-z_]+)\}\}/g;
  const fields: string[] = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    if (!fields.includes(match[1])) {
      fields.push(match[1]);
    }
  }
  
  return fields;
}

/**
 * Check if content has unresolved merge fields
 */
export function hasUnresolvedFields(content: string): boolean {
  return /\{\{[a-z_]+\}\}/.test(content);
}