import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

export interface SearchResult {
  id: string;
  type: 'trip' | 'customer' | 'driver' | 'invoice' | 'vehicle';
  title: string;
  subtitle: string;
  relevanceScore: number;
  data: Record<string, any>;
  actions?: {
    label: string;
    href: string;
  }[];
}

interface ParsedQuery {
  entities: string[];
  locations: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  intent: 'find' | 'count' | 'list' | 'compare' | 'unknown';
  keywords: string[];
}

// Dutch natural language patterns
const DATE_PATTERNS: Record<string, () => { start: Date; end: Date }> = {
  'vandaag': () => {
    const today = new Date();
    return { start: today, end: today };
  },
  'morgen': () => {
    const tomorrow = addDays(new Date(), 1);
    return { start: tomorrow, end: tomorrow };
  },
  'overmorgen': () => {
    const day = addDays(new Date(), 2);
    return { start: day, end: day };
  },
  'gisteren': () => {
    const yesterday = subDays(new Date(), 1);
    return { start: yesterday, end: yesterday };
  },
  'deze week': () => {
    const today = new Date();
    return { start: startOfWeek(today, { locale: nl }), end: endOfWeek(today, { locale: nl }) };
  },
  'volgende week': () => {
    const nextWeek = addDays(new Date(), 7);
    return { start: startOfWeek(nextWeek, { locale: nl }), end: endOfWeek(nextWeek, { locale: nl }) };
  },
  'vorige week': () => {
    const lastWeek = subDays(new Date(), 7);
    return { start: startOfWeek(lastWeek, { locale: nl }), end: endOfWeek(lastWeek, { locale: nl }) };
  },
  'deze maand': () => {
    const today = new Date();
    return { start: startOfMonth(today), end: endOfMonth(today) };
  },
  'volgende maand': () => {
    const nextMonth = addDays(endOfMonth(new Date()), 1);
    return { start: startOfMonth(nextMonth), end: endOfMonth(nextMonth) };
  },
  'vorige maand': () => {
    const lastMonth = subDays(startOfMonth(new Date()), 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
  },
};

const STATUS_PATTERNS: Record<string, string[]> = {
  'open': ['draft', 'aanvraag', 'gepland', 'geladen'],
  'aanvraag': ['aanvraag', 'aangevraagd', 'in_afwachting'],
  'offerte': ['offerte', 'quote'],
  'geladen': ['geladen', 'loaded'],
  'lopend': ['onderweg', 'in_transit'],
  'afgeleverd': ['afgeleverd', 'delivered'],
  'afgerond': ['afgerond', 'voltooid', 'completed'],
  'gecontroleerd': ['gecontroleerd', 'checked', 'verified'],
  'gefactureerd': ['gefactureerd', 'invoiced', 'billed'],
  'geannuleerd': ['geannuleerd', 'cancelled'],
  'betaald': ['betaald', 'paid'],
  'onbetaald': ['verzonden', 'vervallen'],
};

const ENTITY_PATTERNS: Record<string, string[]> = {
  'trip': ['rit', 'ritten', 'order', 'orders', 'transport', 'transporten', 'zending', 'zendingen'],
  'customer': ['klant', 'klanten', 'bedrijf', 'bedrijven', 'opdrachtgever'],
  'driver': ['chauffeur', 'chauffeurs', 'rijder', 'rijders'],
  'invoice': ['factuur', 'facturen', 'rekening', 'rekeningen'],
  'vehicle': ['voertuig', 'voertuigen', 'bus', 'bussen', 'auto', 'wagen'],
};

const INTENT_PATTERNS: Record<string, string[]> = {
  'find': ['zoek', 'vind', 'waar', 'welke', 'toon', 'laat zien', 'geef'],
  'count': ['hoeveel', 'aantal', 'tel', 'count'],
  'list': ['lijst', 'overzicht', 'alle'],
  'compare': ['vergelijk', 'versus', 'vs'],
};

// Dutch cities for location detection
const DUTCH_CITIES = [
  'amsterdam', 'rotterdam', 'den haag', 'utrecht', 'eindhoven', 'groningen',
  'tilburg', 'almere', 'breda', 'nijmegen', 'apeldoorn', 'haarlem', 'arnhem',
  'enschede', 'amersfoort', 'zaanstad', 'haarlemmermeer', 'den bosch', 'zwolle',
  'leiden', 'dordrecht', 'zoetermeer', 'maastricht', 'delft', 'deventer',
  'venlo', 'alkmaar', 'heerlen', 'hilversum', 'schiedam', 'vlaardingen',
];

function parseQuery(query: string): ParsedQuery {
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);
  
  const result: ParsedQuery = {
    entities: [],
    locations: [],
    keywords: [],
    intent: 'unknown',
  };

  // Detect intent
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some((p) => normalizedQuery.includes(p))) {
      result.intent = intent as ParsedQuery['intent'];
      break;
    }
  }

  // Detect entities
  for (const [entity, patterns] of Object.entries(ENTITY_PATTERNS)) {
    if (patterns.some((p) => normalizedQuery.includes(p))) {
      result.entities.push(entity);
    }
  }

  // Detect date range
  for (const [pattern, getRange] of Object.entries(DATE_PATTERNS)) {
    if (normalizedQuery.includes(pattern)) {
      result.dateRange = getRange();
      break;
    }
  }

  // Detect status
  for (const [status, patterns] of Object.entries(STATUS_PATTERNS)) {
    if (patterns.some((p) => normalizedQuery.includes(p)) || normalizedQuery.includes(status)) {
      if (!result.status) result.status = [];
      result.status.push(status);
    }
  }

  // Detect locations
  DUTCH_CITIES.forEach((city) => {
    if (normalizedQuery.includes(city)) {
      result.locations.push(city);
    }
  });

  // Extract remaining keywords (filter out common words)
  const stopWords = ['de', 'het', 'een', 'van', 'naar', 'in', 'op', 'voor', 'met', 'en', 'of', 'is', 'zijn', 'worden', 'die', 'dat'];
  words.forEach((word) => {
    if (
      word.length > 2 &&
      !stopWords.includes(word) &&
      !Object.values(DATE_PATTERNS).some((_, i) => Object.keys(DATE_PATTERNS)[i].includes(word)) &&
      !Object.values(ENTITY_PATTERNS).flat().includes(word) &&
      !Object.values(INTENT_PATTERNS).flat().includes(word) &&
      !DUTCH_CITIES.includes(word)
    ) {
      result.keywords.push(word);
    }
  });

  // Default to trip if no entity specified
  if (result.entities.length === 0) {
    result.entities.push('trip');
  }

  return result;
}

export function useNaturalLanguageSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setParsedQuery(null);
      return;
    }

    setLoading(true);
    try {
      const parsed = parseQuery(query);
      setParsedQuery(parsed);

      const searchResults: SearchResult[] = [];

      // Search trips
      if (parsed.entities.includes('trip')) {
        let tripQuery = (supabase
          .from('trips')
          .select('id, order_number, trip_date, status, price, customer_id, driver_id, pickup_city, delivery_city')
          .order('trip_date', { ascending: false })
          .limit(20)) as any;

        // Apply date filter
        if (parsed.dateRange) {
          tripQuery = tripQuery
            .gte('trip_date', format(parsed.dateRange.start, 'yyyy-MM-dd'))
            .lte('trip_date', format(parsed.dateRange.end, 'yyyy-MM-dd'));
        }

        // Apply location filter
        if (parsed.locations.length > 0) {
          const locationFilters = parsed.locations.map((loc) => 
            `pickup_city.ilike.%${loc}%,delivery_city.ilike.%${loc}%`
          ).join(',');
          tripQuery = tripQuery.or(locationFilters);
        }

        // Apply status filter
        if (parsed.status && parsed.status.length > 0) {
          const statusValues = parsed.status.flatMap((s) => STATUS_PATTERNS[s] || [s]) as ("afgerond" | "geannuleerd" | "gepland" | "onderweg")[];
          tripQuery = tripQuery.in('status', statusValues);
        }

        // Apply keyword search
        if (parsed.keywords.length > 0) {
          const keywordFilter = parsed.keywords.map((kw) => 
            `order_number.ilike.%${kw}%,pickup_city.ilike.%${kw}%,delivery_city.ilike.%${kw}%,pickup_company_name.ilike.%${kw}%`
          ).join(',');
          tripQuery = tripQuery.or(keywordFilter);
        }

        const { data: trips } = await tripQuery;

        (trips || []).forEach((trip: any) => {
          searchResults.push({
            id: trip.id,
            type: 'trip',
            title: `${trip.order_number || trip.id.slice(0, 8)} - ${trip.pickup_city || 'Ophaal'} → ${trip.delivery_city || 'Levering'}`,
            subtitle: `${format(parseISO(trip.trip_date), 'd MMM yyyy', { locale: nl })} | ${trip.customer?.company_name || 'Geen klant'} | ${trip.status}`,
            relevanceScore: 100 - searchResults.length,
            data: trip,
            actions: [
              { label: 'Bekijk', href: `/orders?edit=${trip.id}` },
              { label: 'Tracking', href: `/track-chauffeurs?trip=${trip.id}` },
            ],
          });
        });
      }

      // Search customers
      if (parsed.entities.includes('customer')) {
        let customerQuery = supabase
          .from('customers')
          .select('*')
          .eq('is_active', true)
          .limit(10);

        if (parsed.keywords.length > 0) {
          const keywordFilter = parsed.keywords.map((kw) => 
            `company_name.ilike.%${kw}%,contact_name.ilike.%${kw}%,city.ilike.%${kw}%`
          ).join(',');
          customerQuery = customerQuery.or(keywordFilter);
        }

        if (parsed.locations.length > 0) {
          const locationFilter = parsed.locations.map((loc) => 
            `city.ilike.%${loc}%`
          ).join(',');
          customerQuery = customerQuery.or(locationFilter);
        }

        const { data: customers } = await customerQuery;

        (customers || []).forEach((customer: any) => {
          searchResults.push({
            id: customer.id,
            type: 'customer',
            title: customer.company_name,
            subtitle: `${customer.city || 'Geen stad'} | ${customer.contact_name || 'Geen contact'}`,
            relevanceScore: 90 - searchResults.length,
            data: customer,
            actions: [
              { label: 'Bekijk', href: `/customers?id=${customer.id}` },
              { label: 'Nieuwe order', href: `/orders/edit?customer=${customer.id}` },
            ],
          });
        });
      }

      // Search drivers
      if (parsed.entities.includes('driver')) {
        let driverQuery = supabase
          .from('profiles')
          .select('*')
          .limit(10);

        if (parsed.keywords.length > 0) {
          const keywordFilter = parsed.keywords.map((kw) => 
            `full_name.ilike.%${kw}%`
          ).join(',');
          driverQuery = driverQuery.or(keywordFilter);
        }

        const { data: drivers } = await driverQuery;

        (drivers || []).forEach((driver: any) => {
          if (driver.full_name) {
            searchResults.push({
              id: driver.user_id,
              type: 'driver',
              title: driver.full_name,
              subtitle: driver.phone || 'Geen telefoon',
              relevanceScore: 85 - searchResults.length,
              data: driver,
              actions: [
                { label: 'Bekijk', href: `/planning-program?driver=${driver.user_id}` },
              ],
            });
          }
        });
      }

      // Search invoices
      if (parsed.entities.includes('invoice')) {
        let invoiceQuery = supabase
          .from('invoices')
          .select('*, customer:customers(company_name)')
          .order('invoice_date', { ascending: false })
          .limit(10);

        if (parsed.status && parsed.status.length > 0) {
          if (parsed.status.includes('betaald')) {
            invoiceQuery = invoiceQuery.eq('status', 'betaald');
          } else if (parsed.status.includes('onbetaald')) {
            invoiceQuery = invoiceQuery.in('status', ['verzonden', 'vervallen']);
          }
        }

        if (parsed.dateRange) {
          invoiceQuery = invoiceQuery
            .gte('invoice_date', format(parsed.dateRange.start, 'yyyy-MM-dd'))
            .lte('invoice_date', format(parsed.dateRange.end, 'yyyy-MM-dd'));
        }

        const { data: invoices } = await invoiceQuery;

        (invoices || []).forEach((invoice: any) => {
          searchResults.push({
            id: invoice.id,
            type: 'invoice',
            title: `Factuur ${invoice.invoice_number || invoice.id.slice(0, 8)}`,
            subtitle: `${invoice.customer?.company_name || 'Geen klant'} | €${Number(invoice.total_amount || 0).toFixed(2)} | ${invoice.status}`,
            relevanceScore: 80 - searchResults.length,
            data: invoice,
            actions: [
              { label: 'Bekijk', href: `/invoices?id=${invoice.id}` },
            ],
          });
        });
      }

      // Search vehicles
      if (parsed.entities.includes('vehicle')) {
        let vehicleQuery = supabase
          .from('vehicles')
          .select('*')
          .eq('is_active', true)
          .limit(10);

        if (parsed.keywords.length > 0) {
          const keywordFilter = parsed.keywords.map((kw) => 
            `license_plate.ilike.%${kw}%,brand.ilike.%${kw}%,model.ilike.%${kw}%`
          ).join(',');
          vehicleQuery = vehicleQuery.or(keywordFilter);
        }

        const { data: vehicles } = await vehicleQuery;

        (vehicles || []).forEach((vehicle: any) => {
          searchResults.push({
            id: vehicle.id,
            type: 'vehicle',
            title: vehicle.license_plate,
            subtitle: `${vehicle.brand || ''} ${vehicle.model || ''} | ${vehicle.vehicle_type || 'Type onbekend'}`,
            relevanceScore: 75 - searchResults.length,
            data: vehicle,
            actions: [
              { label: 'Bekijk', href: `/fleet` },
            ],
          });
        });
      }

      // Sort by relevance
      searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      setResults(searchResults);

      // Generate suggestions based on context
      const newSuggestions: string[] = [];
      if (searchResults.length === 0) {
        newSuggestions.push('Probeer: "ritten naar amsterdam deze week"');
        newSuggestions.push('Probeer: "openstaande facturen"');
        newSuggestions.push('Probeer: "chauffeurs beschikbaar morgen"');
      } else if (parsed.entities.includes('trip') && !parsed.dateRange) {
        newSuggestions.push('Tip: voeg "vandaag" of "deze week" toe voor tijdsfilter');
      }
      setSuggestions(newSuggestions);

    } catch {
      // Silent fail for search
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setResults([]);
    setParsedQuery(null);
    setSuggestions([]);
  }, []);

  // Quick search examples
  const quickSearches = [
    { label: 'Ritten vandaag', query: 'ritten vandaag' },
    { label: 'Ritten naar Rotterdam', query: 'ritten naar rotterdam' },
    { label: 'Openstaande facturen', query: 'onbetaalde facturen' },
    { label: 'Ritten deze week', query: 'alle ritten deze week' },
    { label: 'Klanten in Amsterdam', query: 'klanten amsterdam' },
  ];

  return {
    search,
    results,
    loading,
    parsedQuery,
    suggestions,
    clearSearch,
    quickSearches,
    resultCount: results.length,
  };
}
