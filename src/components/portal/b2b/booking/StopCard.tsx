import { useState } from 'react';
import { 
  MapPin, 
  GripVertical, 
  ChevronDown, 
  ChevronUp,
  Trash2,
  Package,
  Plus,
  Clock,
  Building2,
  User,
  Phone,
  FileText,
  CheckCircle2,
  Loader2,
  BookmarkPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BookingStop } from './types';
import { usePostcodeLookup, formatDutchPostcode } from '@/hooks/usePostcodeLookup';
import { CargoItemCard } from './CargoItemCard';
import { AddressPickerPopover } from '@/components/portal/b2b/AddressPickerPopover';
import type { CustomerLocation } from '@/hooks/useCustomerLocations';

interface StopCardProps {
  stop: BookingStop;
  index: number;
  totalStops: number;
  onUpdate: (updates: Partial<BookingStop>) => void;
  onRemove: () => void;
  onAddCargo: () => void;
  onUpdateCargo: (itemId: string, updates: any) => void;
  onRemoveCargo: (itemId: string) => void;
  canRemove: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  savedLocations?: CustomerLocation[];
  onSaveToAddressBook?: (stop: BookingStop) => void;
}

export const StopCard = ({
  stop,
  index,
  totalStops,
  onUpdate,
  onRemove,
  onAddCargo,
  onUpdateCargo,
  onRemoveCargo,
  canRemove,
  isDragging,
  onDragStart,
  onDragEnd,
  savedLocations = [],
  onSaveToAddressBook,
}: StopCardProps) => {
  const { lookupPostcode, loading: lookupLoading } = usePostcodeLookup();
  const [addressLookedUp, setAddressLookedUp] = useState(false);

  const handlePostcodeLookup = async () => {
    if (stop.postcode && stop.postcode.replace(/\s/g, '').length >= 6) {
      const result = await lookupPostcode(stop.postcode, stop.houseNumber || undefined);
      if (result) {
        onUpdate({
          street: result.street,
          city: result.city,
          postcode: formatDutchPostcode(stop.postcode),
        });
        setAddressLookedUp(true);
        setTimeout(() => setAddressLookedUp(false), 2000);
      }
    }
  };

  const stopTypeConfig = {
    pickup: { 
      label: 'Ophalen', 
      color: 'bg-primary/10 text-primary border-primary/30',
      icon: '📦',
      gradient: 'from-primary/20 to-primary/5',
    },
    delivery: { 
      label: 'Afleveren', 
      color: 'bg-gold/10 text-gold border-gold/30',
      icon: '📍',
      gradient: 'from-gold/20 to-gold/5',
    },
    hub: { 
      label: 'Hub', 
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      icon: '🏭',
      gradient: 'from-purple-500/20 to-purple-500/5',
    },
  };

  const config = stopTypeConfig[stop.type];

  return (
    <div
      layout
      className={cn(
        "group relative rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden transition-all",
        isDragging ? "shadow-2xl ring-2 ring-primary scale-[1.02]" : "border-border/50 hover:border-border"
      )}
    >
      {/* Gradient accent */}
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", config.gradient)} />
      
      {/* Header */}
      <div 
        className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer touch-manipulation"
        onClick={() => onUpdate({ isExpanded: !stop.isExpanded })}
      >
        {/* Drag Handle */}
        <div 
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted transition-colors"
          onMouseDown={onDragStart}
          onMouseUp={onDragEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Stop number & type */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center font-bold text-sm text-muted-foreground">
            {index + 1}
          </div>
          <div>
            <Badge variant="outline" className={cn("text-[10px] sm:text-xs font-medium", config.color)}>
              {config.icon} {config.label}
            </Badge>
            {stop.company && (
              <p className="text-sm font-medium mt-0.5 truncate max-w-[120px] sm:max-w-none">{stop.company}</p>
            )}
            {stop.city && (
              <p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{stop.city}</p>
            )}
          </div>
        </div>

        {/* Cargo count */}
        {stop.loadItems.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-[10px] sm:text-xs">
            <Package className="h-3 w-3 mr-1" />
            {stop.loadItems.reduce((sum, i) => sum + i.quantity, 0)} items
          </Badge>
        )}

        {/* Expand/Collapse */}
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); onUpdate({ isExpanded: !stop.isExpanded }); }}>
          {stop.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expanded Content */}
        {stop.isExpanded && (
          <div
            className="overflow-hidden"
          >
            <div className="p-3 sm:p-4 pt-0 space-y-4 sm:space-y-6 border-t border-border/50">
              {/* Stop Type Selector */}
              <div className="flex gap-2">
                {(['pickup', 'delivery', 'hub'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => onUpdate({ type })}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation active:scale-[0.97]",
                      stop.type === type 
                        ? stopTypeConfig[type].color + " border"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {stopTypeConfig[type].icon} {stopTypeConfig[type].label}
                  </button>
                ))}
              </div>

              {/* Company & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Bedrijfsnaam
                  </Label>
                  <Input
                    placeholder="Bedrijf B.V."
                    value={stop.company}
                    onChange={(e) => onUpdate({ company: e.target.value })}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Contactpersoon
                  </Label>
                  <Input
                    placeholder="Jan Jansen"
                    value={stop.contact}
                    onChange={(e) => onUpdate({ contact: e.target.value })}
                    className="h-9 sm:h-10"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Telefoonnummer
                </Label>
                <Input
                  placeholder="+31 6 12345678"
                  value={stop.phone}
                  onChange={(e) => onUpdate({ phone: e.target.value })}
                  className="h-9 sm:h-10"
                />
              </div>

              {/* Address */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Adres
                  </Label>
                  {savedLocations.length > 0 && (
                    <AddressPickerPopover
                      locations={savedLocations}
                      onSelect={(loc) => {
                        onUpdate({
                          company: loc.company_name || '',
                          contact: loc.contact_name || '',
                          phone: loc.contact_phone || '',
                          postcode: loc.postcode || '',
                          houseNumber: loc.house_number || '',
                          street: loc.address_line || '',
                          city: loc.city || '',
                          notes: loc.access_notes || loc.default_instructions || '',
                        });
                      }}
                    />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="col-span-2 relative">
                    <Input
                      placeholder="1234 AB"
                      value={stop.postcode}
                      onChange={(e) => onUpdate({ postcode: e.target.value })}
                      onBlur={handlePostcodeLookup}
                      className="h-9 sm:h-10 pr-8"
                    />
                    {lookupLoading && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {addressLookedUp && (
                      <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  <Input
                    placeholder="Nr."
                    value={stop.houseNumber}
                    onChange={(e) => onUpdate({ houseNumber: e.target.value })}
                    onBlur={handlePostcodeLookup}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <Input
                    placeholder="Straatnaam"
                    value={stop.street}
                    onChange={(e) => onUpdate({ street: e.target.value })}
                    className={cn("h-9 sm:h-10", addressLookedUp && "bg-emerald-500/5 border-emerald-500/30")}
                  />
                  <Input
                    placeholder="Stad"
                    value={stop.city}
                    onChange={(e) => onUpdate({ city: e.target.value })}
                    className={cn("h-9 sm:h-10", addressLookedUp && "bg-emerald-500/5 border-emerald-500/30")}
                  />
                </div>
              </div>

              {/* Date & Time Window */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Datum
                  </Label>
                  <Input
                    type="date"
                    value={stop.date}
                    onChange={(e) => onUpdate({ date: e.target.value })}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tijdvenster van</Label>
                  <Input
                    type="time"
                    value={stop.timeWindowFrom}
                    onChange={(e) => onUpdate({ timeWindowFrom: e.target.value })}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tijdvenster tot</Label>
                  <Input
                    type="time"
                    value={stop.timeWindowTo}
                    onChange={(e) => onUpdate({ timeWindowTo: e.target.value })}
                    className="h-9 sm:h-10"
                  />
                </div>
              </div>

              {/* Reference & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Referentie (optioneel)
                  </Label>
                  <Input
                    placeholder="REF-12345"
                    value={stop.reference}
                    onChange={(e) => onUpdate({ reference: e.target.value })}
                    className="h-9 sm:h-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Instructies</Label>
                <Textarea
                  placeholder="Bijv. achterom leveren, bij magazijn aanbellen..."
                  value={stop.notes}
                  onChange={(e) => onUpdate({ notes: e.target.value })}
                  className="resize-none min-h-[60px]"
                />
              </div>

              {/* Cargo Items (only for pickup/hub) */}
              {(stop.type === 'pickup' || stop.type === 'hub') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Package className="h-3 w-3" /> Lading op te halen
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddCargo}
                      className="h-7 text-xs touch-manipulation active:scale-[0.97]"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Item toevoegen
                    </Button>
                  </div>
                    {stop.loadItems.map((item, itemIndex) => (
                      <CargoItemCard
                        key={item.id}
                        item={item}
                        index={itemIndex}
                        onUpdate={(updates) => onUpdateCargo(item.id, updates)}
                        onRemove={() => onRemoveCargo(item.id)}
                      />
                    ))}
                  {stop.loadItems.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Voeg lading toe die hier opgehaald wordt
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                {onSaveToAddressBook && stop.postcode && stop.city ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSaveToAddressBook(stop)}
                    className="text-xs touch-manipulation active:scale-[0.97]"
                  >
                    <BookmarkPlus className="h-4 w-4 mr-1" />
                    Opslaan in adresboek
                  </Button>
                ) : <div />}
                {canRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation active:scale-[0.97]"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Verwijder stop
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
