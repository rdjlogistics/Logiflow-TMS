import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, Route, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  type: 'order' | 'customer' | 'trip';
}

const TYPE_ICONS = {
  order: FileText,
  customer: Users,
  trip: Route,
};

const TYPE_LABELS = {
  order: 'Orders',
  customer: 'Klanten',
  trip: 'Ritten',
};

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const pattern = `%${q}%`;
      const [orders, customers, trips] = await Promise.all([
        supabase.from('trips').select('id, order_number, pickup_city, delivery_city').ilike('order_number', pattern).is('deleted_at', null).limit(5),
        supabase.from('customers').select('id, company_name, city').ilike('company_name', pattern).limit(5),
        supabase.from('trips').select('id, pickup_city, delivery_city, trip_date, order_number').or(`pickup_city.ilike.${pattern},delivery_city.ilike.${pattern}`).is('deleted_at', null).limit(5),
      ]);

      const r: SearchResult[] = [];
      orders.data?.forEach(o => r.push({
        id: `order-${o.id}`, label: o.order_number || o.id.slice(0, 8),
        sublabel: [o.pickup_city, o.delivery_city].filter(Boolean).join(' → '),
        href: `/orders`, type: 'order',
      }));
      customers.data?.forEach(c => r.push({
        id: `customer-${c.id}`, label: c.company_name,
        sublabel: c.city || undefined,
        href: `/customers`, type: 'customer',
      }));
      // Deduplicate trips that already appeared as orders
      const orderIds = new Set(orders.data?.map(o => o.id) || []);
      trips.data?.filter(t => !orderIds.has(t.id)).forEach(t => r.push({
        id: `trip-${t.id}`, label: [t.pickup_city, t.delivery_city].filter(Boolean).join(' → ') || t.order_number || 'Rit',
        sublabel: t.trip_date ? new Date(t.trip_date).toLocaleDateString('nl-NL') : undefined,
        href: `/trips`, type: 'trip',
      }));
      setResults(r);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      navigate(results[selectedIndex].href);
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setSelectedIndex(-1); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Zoeken..."
          className="h-8 w-48 lg:w-64 pl-8 pr-8 text-sm bg-muted/50 border-border/50"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 left-0 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Geen resultaten voor "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS];
              return (
                <div key={type}>
                  <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Icon className="h-3 w-3" />
                    {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}
                  </div>
                  {items.map(item => {
                    flatIndex++;
                    const idx = flatIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { navigate(item.href); setOpen(false); setQuery(''); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex flex-col",
                          selectedIndex === idx && "bg-muted"
                        )}
                      >
                        <span className="font-medium truncate">{item.label}</span>
                        {item.sublabel && <span className="text-xs text-muted-foreground truncate">{item.sublabel}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
