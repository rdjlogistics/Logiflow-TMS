import { useEffect, useState, useCallback, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash2, Calendar as CalendarIcon, Loader2, CheckCircle2, Copy, MapPin, Clock, Building2, ChevronDown, GripVertical } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse } from "date-fns";
import { nl } from "date-fns/locale";
import { capitalizeCity } from "@/lib/date-utils";
import { supabase } from "@/integrations/supabase/client";
import { usePostcodeLookup, formatDutchPostcode } from "@/hooks/usePostcodeLookup";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface Address {
  id: string;
  label: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  street: string;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
}

export interface DestinationData {
  id: string;
  stop_type: 'pickup' | 'delivery' | 'both';
  address_book_id: string;
  country: string;
  postal_code: string;
  house_number: string;
  street: string;
  street_line_2: string;
  city: string;
  customer_reference: string;
  waybill_number: string;
  pickup_date: string;
  time_window_start: string;
  time_window_end: string;
  company_name: string;
  contact_name: string;
  phone: string;
  notes: string;
  save_to_address_book: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

interface DestinationCardProps {
  index: number;
  data: DestinationData;
  onChange: (data: DestinationData) => void;
  onRemove: () => void;
  canRemove: boolean;
  onCopyToDelivery?: () => void;
  showCopyToDelivery?: boolean;
  dragHandleProps?: {
    onPointerDown: (e: React.PointerEvent) => void;
    style?: React.CSSProperties;
  };
}

const stopTypeConfig = {
  pickup: { label: 'Ophalen', borderColor: 'border-l-emerald-500', badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  delivery: { label: 'Afleveren', borderColor: 'border-l-primary', badgeBg: 'bg-primary/10 text-primary' },
  both: { label: 'Beide', borderColor: 'border-l-amber-500', badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
};

/** Section header for 3-column layout */
const SectionHeader = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 mb-3 pb-1.5 border-b border-border/20">
    <Icon className="h-3 w-3 text-muted-foreground/60" />
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{children}</span>
  </div>
);

/** Compact summary bar for collapsed mobile view */
const DestinationSummary = ({ data, config, index }: { data: DestinationData; config: typeof stopTypeConfig['pickup']; index: number }) => {
  const city = data.city || data.postal_code || '—';
  const company = data.company_name;
  const date = data.pickup_date ? new Date(data.pickup_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '';
  const time = data.time_window_start && data.time_window_end ? `${data.time_window_start}–${data.time_window_end}` : '';
  
  return (
    <div className="flex items-center gap-2 min-w-0 py-0.5">
      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", config.badgeBg)}>
        {config.label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 text-sm">
        <span className="font-medium truncate">{city}</span>
        {company && (
          <>
            <span className="text-muted-foreground/40">→</span>
            <span className="text-muted-foreground truncate">{company}</span>
          </>
        )}
      </div>
      {(date || time) && (
        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
          {date}{time && ` ${time}`}
        </span>
      )}
    </div>
  );
};

const DestinationCard = ({ index, data, onChange, onRemove, canRemove, onCopyToDelivery, showCopyToDelivery, dragHandleProps }: DestinationCardProps) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const { lookupPostcode, loading: postcodeLoading } = usePostcodeLookup();
  const [autoFilled, setAutoFilled] = useState(false);
  const lastLookupRef = useRef("");
  const dataRef = useRef(data);
  dataRef.current = data;

  // Sync expanded state when switching between mobile/desktop
  useEffect(() => {
    if (!isMobile) setIsExpanded(true);
  }, [isMobile]);

  useEffect(() => {
    const fetchAddresses = async () => {
      const { data: addressData } = await supabase
        .from('address_book')
        .select('*')
        .eq('is_active', true)
        .order('label');
      
      if (addressData) setAddresses(addressData);
    };
    fetchAddresses();
  }, []);

  const handleChange = (field: keyof DestinationData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handlePostcodeLookup = useCallback(async () => {
    const currentData = dataRef.current;
    const cleaned = currentData.postal_code.replace(/\s/g, '').toUpperCase();
    
    if (
      (currentData.country === 'Nederland' || currentData.country === 'NL') &&
      cleaned.length === 6 && 
      /^[1-9][0-9]{3}[A-Z]{2}$/.test(cleaned)
    ) {
      const lookupKey = `${cleaned}-${currentData.house_number}`;
      
      if (lookupKey !== lastLookupRef.current) {
        lastLookupRef.current = lookupKey;
        const result = await lookupPostcode(cleaned, currentData.house_number);
        
        if (result) {
          const latest = dataRef.current;
          const updates: Partial<DestinationData> = {};
          if (result.street) updates.street = result.street;
          if (result.city) updates.city = result.city;
          if (Object.keys(updates).length > 0) {
            onChange({ ...latest, ...updates });
            setAutoFilled(true);
            setTimeout(() => setAutoFilled(false), 3000);
          }
        }
      }
    }
  }, [lookupPostcode, onChange]);

  const handlePostcodeBlur = () => {
    const currentData = dataRef.current;
    const formatted = formatDutchPostcode(currentData.postal_code);
    if (formatted !== currentData.postal_code) handleChange('postal_code', formatted);
    handlePostcodeLookup();
  };

  const handleHouseNumberBlur = () => {
    const currentData = dataRef.current;
    if (currentData.house_number && currentData.postal_code.replace(/\s/g, '').length === 6) handlePostcodeLookup();
  };

  const handleAddressSelect = (addressId: string) => {
    const address = addresses.find(a => a.id === addressId);
    if (address) {
      onChange({
        ...data,
        address_book_id: addressId,
        country: address.country || 'Nederland',
        postal_code: address.postal_code || '',
        house_number: address.house_number || '',
        street: address.street || '',
        city: address.city || '',
        company_name: address.company_name || '',
        contact_name: address.contact_name || '',
        phone: address.phone || '',
      });
    }
  };

  const config = stopTypeConfig[data.stop_type];
  const inputMobile = "h-11 sm:h-9 text-sm sm:text-xs rounded-lg touch-manipulation";
  const labelClass = "text-[11px] text-muted-foreground font-medium";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card className={cn(
        "relative border-border/40 bg-card shadow-md hover:shadow-lg hover:ring-primary/20 transition-all touch-manipulation border-l-[3px] ring-1 ring-border/10 sm:bg-card/95 bg-muted/30",
        config.borderColor
      )} style={{ WebkitFontSmoothing: 'antialiased' }}>
        <CardHeader className="pb-2 pt-3 px-3 sm:px-5">
          <div className="flex items-center justify-between">
            <div 
              className={cn(
                "flex items-center gap-2 flex-1 min-w-0",
                isMobile && "cursor-pointer"
              )}
              onClick={() => isMobile && setIsExpanded(!isExpanded)}
            >
              {/* Collapsed: show summary. Expanded: show badge */}
              {isMobile && !isExpanded ? (
                <DestinationSummary data={data} config={config} index={index} />
              ) : (
                <>
                  <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", config.badgeBg)}>
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Stop {index + 1}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {dragHandleProps && (
                <div
                  {...dragHandleProps}
                  className="cursor-grab active:cursor-grabbing touch-manipulation p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  title="Sleep om te herordenen"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              )}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8 touch-manipulation"
                >
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )} />
                </Button>
              )}
              {showCopyToDelivery && onCopyToDelivery && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onCopyToDelivery} 
                  className="h-8 text-xs gap-1 text-primary hover:bg-primary/10 touch-manipulation active:scale-[0.97]"
                  title="Kopieer naar afleveradres"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Kopieer</span>
                </Button>
              )}
              {canRemove && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onRemove} 
                  className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 touch-manipulation active:scale-[0.95]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <CardContent className="px-3 sm:px-5 pb-4 pt-1">
                {/* Radio group */}
                <RadioGroup
                  value={data.stop_type}
                  onValueChange={(v) => handleChange('stop_type', v)}
                  className="flex gap-1.5 mb-4"
                >
                  {(['pickup', 'delivery', 'both'] as const).map(type => (
                    <div key={type} className="flex-1">
                      <Label 
                        htmlFor={`${type}-${data.id}`} 
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-2 sm:py-1.5 rounded-lg cursor-pointer border transition-all touch-manipulation text-xs font-medium min-h-[40px] sm:min-h-0",
                          data.stop_type === type 
                            ? "bg-primary/10 border-primary/50 text-primary shadow-sm" 
                            : "bg-muted/20 border-transparent hover:bg-muted/40 text-muted-foreground"
                        )}
                      >
                        <RadioGroupItem value={type} id={`${type}-${data.id}`} className="sr-only" />
                        {stopTypeConfig[type].label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* === 3-Column Layout: Adres | Planning | Contact === */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                  
                  {/* Column 1: ADRES */}
                  <div>
                    <SectionHeader icon={MapPin}>Adres</SectionHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className={labelClass}>Adresboek</Label>
                        <Select value={data.address_book_id} onValueChange={handleAddressSelect}>
                          <SelectTrigger className={cn(inputMobile)}>
                            <SelectValue placeholder="Selecteer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {addresses.map((addr) => (
                              <SelectItem key={addr.id} value={addr.id} className="py-2 sm:py-1.5">
                                {addr.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className={labelClass}>Land</Label>
                        <Select value={data.country} onValueChange={(v) => handleChange('country', v)}>
                          <SelectTrigger className={cn(inputMobile)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nederland">Nederland</SelectItem>
                            <SelectItem value="België">België</SelectItem>
                            <SelectItem value="Duitsland">Duitsland</SelectItem>
                            <SelectItem value="Frankrijk">Frankrijk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-[1.5fr,1fr] gap-2">
                        <div className="space-y-1">
                          <Label className={cn(labelClass, "flex items-center gap-1")}>
                            Postcode
                            {data.country === 'Nederland' && (
                              <span className="text-[9px] text-primary/70 font-normal">(auto)</span>
                            )}
                          </Label>
                          <div className="relative">
                            <Input
                              value={data.postal_code}
                              onChange={(e) => handleChange('postal_code', e.target.value.toUpperCase())}
                              onBlur={handlePostcodeBlur}
                              placeholder="1234 AB"
                              className={cn(inputMobile, "pr-8")}
                              maxLength={7}
                            />
                            <AnimatePresence>
                              {postcodeLoading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                </motion.div>
                              )}
                              {autoFilled && !postcodeLoading && (
                                <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className={labelClass}>Huisnr</Label>
                          <Input
                            value={data.house_number}
                            onChange={(e) => handleChange('house_number', e.target.value)}
                            onBlur={handleHouseNumberBlur}
                            className={inputMobile}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className={labelClass}>Adres</Label>
                        <motion.div
                          animate={autoFilled ? { boxShadow: ['0 0 0 0px rgba(16,185,129,0)', '0 0 0 3px rgba(16,185,129,0.2)', '0 0 0 0px rgba(16,185,129,0)'] } : {}}
                          transition={{ duration: 1.5 }}
                          className="rounded-lg"
                        >
                          <Input
                            value={data.street}
                            onChange={(e) => handleChange('street', e.target.value)}
                            className={cn(inputMobile, "transition-colors", autoFilled && "border-emerald-400/50 bg-emerald-50/30 dark:bg-emerald-950/20")}
                          />
                        </motion.div>
                      </div>

                      <div className="space-y-1">
                        <Label className={labelClass}>Adresregel 2</Label>
                        <Input
                          value={data.street_line_2}
                          onChange={(e) => handleChange('street_line_2', e.target.value)}
                          className={inputMobile}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className={labelClass}>Woonplaats</Label>
                        <motion.div
                          animate={autoFilled ? { boxShadow: ['0 0 0 0px rgba(16,185,129,0)', '0 0 0 3px rgba(16,185,129,0.2)', '0 0 0 0px rgba(16,185,129,0)'] } : {}}
                          transition={{ duration: 1.5, delay: 0.1 }}
                          className="rounded-lg"
                        >
                          <Input
                            value={data.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            className={cn(inputMobile, "transition-colors", autoFilled && "border-emerald-400/50 bg-emerald-50/30 dark:bg-emerald-950/20")}
                          />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: PLANNING */}
                  <div>
                    <SectionHeader icon={Clock}>Datum & Referenties</SectionHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className={labelClass}>Referentie klant</Label>
                        <Input
                          value={data.customer_reference}
                          onChange={(e) => handleChange('customer_reference', e.target.value)}
                          className={inputMobile}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className={labelClass}>Vrachtbriefnr</Label>
                        <Input
                          value={data.waybill_number}
                          onChange={(e) => handleChange('waybill_number', e.target.value)}
                          className={inputMobile}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className={cn(labelClass, "flex items-center gap-1.5")}>
                          <Calendar className="h-3 w-3" />
                          {data.stop_type === 'delivery' ? 'Aflever' : 'Ophaal'} datum
                        </Label>
                        <Input
                          type="date"
                          value={data.pickup_date}
                          onChange={(e) => handleChange('pickup_date', e.target.value)}
                          className={inputMobile}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className={labelClass}>Tijdvenster</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">Van</span>
                          <Input
                            type="time"
                            value={data.time_window_start}
                            onChange={(e) => handleChange('time_window_start', e.target.value)}
                            className={cn(inputMobile, "flex-1")}
                          />
                          <span className="text-[11px] text-muted-foreground">tot</span>
                          <Input
                            type="time"
                            value={data.time_window_end}
                            onChange={(e) => handleChange('time_window_end', e.target.value)}
                            className={cn(inputMobile, "flex-1")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: CONTACT */}
                  <div>
                    <SectionHeader icon={Building2}>Bedrijf & Contact</SectionHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className={labelClass}>Bedrijfsnaam</Label>
                        <Input
                          value={data.company_name}
                          onChange={(e) => handleChange('company_name', e.target.value)}
                          className={inputMobile}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className={labelClass}>Contactpersoon</Label>
                        <Input
                          value={data.contact_name}
                          onChange={(e) => handleChange('contact_name', e.target.value)}
                          className={inputMobile}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className={labelClass}>Telefoonnummer</Label>
                        <Input
                          value={data.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          type="tel"
                          className={inputMobile}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className={labelClass}>Opmerkingen</Label>
                        <Textarea
                          value={data.notes}
                          onChange={(e) => handleChange('notes', e.target.value)}
                          className="min-h-[70px] sm:min-h-[56px] text-sm sm:text-xs resize-none rounded-lg touch-manipulation"
                          placeholder="Bijzonderheden voor deze stop..."
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id={`save-${data.id}`}
                          checked={data.save_to_address_book}
                          onCheckedChange={(checked) => handleChange('save_to_address_book', checked)}
                          className="h-5 w-5 sm:h-4 sm:w-4 touch-manipulation"
                        />
                        <Label htmlFor={`save-${data.id}`} className="text-[11px] cursor-pointer touch-manipulation text-muted-foreground">
                          Opslaan in adresboek
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default DestinationCard;
