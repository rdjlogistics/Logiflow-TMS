import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Building2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CustomerLocation } from '@/hooks/useCustomerLocations';

interface AddressPickerPopoverProps {
  locations: CustomerLocation[];
  onSelect: (location: CustomerLocation) => void;
  loading?: boolean;
}

export const AddressPickerPopover = ({ locations, onSelect, loading }: AddressPickerPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = locations.filter(loc => {
    const q = search.toLowerCase();
    return (
      loc.label.toLowerCase().includes(q) ||
      (loc.company_name || '').toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q) ||
      loc.postcode.toLowerCase().includes(q)
    );
  });

  const favorites = filtered.filter(l => l.is_favorite);
  const others = filtered.filter(l => !l.is_favorite);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 touch-manipulation active:scale-[0.97] gap-1"
        >
          <MapPin className="h-3 w-3" />
          Adresboek
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card/95 backdrop-blur-xl border-border/30" align="start">
        <div className="p-3 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Zoek adres..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {locations.length === 0 && !loading && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nog geen adressen opgeslagen
            </div>
          )}

          {favorites.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <span className="text-[10px] font-medium text-gold uppercase tracking-wider">Favorieten</span>
            </div>
          )}
          {favorites.map(loc => (
            <button
              key={loc.id}
              onClick={() => { onSelect(loc); setOpen(false); setSearch(''); }}
              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-start gap-2.5 border-b border-border/20 last:border-0"
            >
              <Star className="h-3.5 w-3.5 mt-0.5 text-gold fill-gold shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{loc.label}</div>
                {loc.company_name && <div className="text-[10px] text-muted-foreground truncate">{loc.company_name}</div>}
                <div className="text-[10px] text-muted-foreground truncate">
                  {loc.address_line} {loc.house_number}, {loc.postcode} {loc.city}
                </div>
              </div>
            </button>
          ))}

          {others.length > 0 && favorites.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Overige</span>
            </div>
          )}
          {others.map(loc => (
            <button
              key={loc.id}
              onClick={() => { onSelect(loc); setOpen(false); setSearch(''); }}
              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-start gap-2.5 border-b border-border/20 last:border-0"
            >
              <Building2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{loc.label}</div>
                {loc.company_name && <div className="text-[10px] text-muted-foreground truncate">{loc.company_name}</div>}
                <div className="text-[10px] text-muted-foreground truncate">
                  {loc.address_line} {loc.house_number}, {loc.postcode} {loc.city}
                </div>
              </div>
            </button>
          ))}

          {filtered.length === 0 && locations.length > 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Geen resultaten voor "{search}"
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
