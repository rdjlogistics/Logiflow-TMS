import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Filter,
  X,
  Calendar,
  Building2,
  Truck,
  Package,
  MapPin,
  Euro,
  RotateCcw,
  ChevronDown,
  Search,
} from "lucide-react";
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  name: string;
}

interface Filters {
  status: string;
  product: string;
  carrier: string;
  customer: string;
  vehicle: string;
  dateFrom: string;
  dateTo: string;
  periodPreset: string;
  marginMin?: number;
  marginMax?: number;
  cities?: string[];
}

interface AdvancedFiltersPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  customers: FilterOption[];
  carriers: FilterOption[];
  vehicles: FilterOption[];
  products: FilterOption[];
  onReset: () => void;
}

const datePresets = [
  { id: "today", label: "Vandaag" },
  { id: "yesterday", label: "Gisteren" },
  { id: "this_week", label: "Deze week" },
  { id: "last_week", label: "Vorige week" },
  { id: "this_month", label: "Deze maand" },
  { id: "last_month", label: "Vorige maand" },
  { id: "last_30_days", label: "Laatste 30 dagen" },
  { id: "this_year", label: "Dit jaar" },
  { id: "custom", label: "Aangepast" },
];

const statusOptions = [
  { id: "all", label: "Alle statussen", color: "bg-muted" },
  { id: "aanvraag", label: "Aanvraag", color: "bg-orange-500" },
  { id: "gepland", label: "Gepland", color: "bg-muted-foreground/40" },
  { id: "onderweg", label: "Onderweg", color: "bg-blue-500" },
  { id: "afgerond", label: "Afgerond", color: "bg-green-500" },
  { id: "gecontroleerd", label: "Gecontroleerd", color: "bg-purple-500" },
  { id: "geannuleerd", label: "Geannuleerd", color: "bg-destructive" },
];

export const AdvancedFiltersPanel = ({
  filters,
  onFiltersChange,
  customers,
  carriers,
  vehicles,
  products,
  onReset,
}: AdvancedFiltersPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchCarrier, setSearchCarrier] = useState("");

  const activeFiltersCount = [
    filters.status !== "all",
    filters.product !== "all",
    filters.carrier !== "all",
    filters.customer !== "all",
    filters.vehicle !== "all",
    filters.marginMin !== undefined,
    filters.marginMax !== undefined,
  ].filter(Boolean).length;

  const handleDatePreset = (preset: string) => {
    const now = new Date();
    let dateFrom = "";
    let dateTo = "";

    switch (preset) {
      case "today":
        dateFrom = dateTo = format(now, "yyyy-MM-dd");
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        dateFrom = dateTo = format(yesterday, "yyyy-MM-dd");
        break;
      case "this_week":
        dateFrom = format(startOfWeek(now, { locale: nl }), "yyyy-MM-dd");
        dateTo = format(endOfWeek(now, { locale: nl }), "yyyy-MM-dd");
        break;
      case "last_week":
        const lastWeek = subDays(startOfWeek(now, { locale: nl }), 1);
        dateFrom = format(startOfWeek(lastWeek, { locale: nl }), "yyyy-MM-dd");
        dateTo = format(endOfWeek(lastWeek, { locale: nl }), "yyyy-MM-dd");
        break;
      case "this_month":
        dateFrom = format(startOfMonth(now), "yyyy-MM-dd");
        dateTo = format(endOfMonth(now), "yyyy-MM-dd");
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        dateFrom = format(startOfMonth(lastMonth), "yyyy-MM-dd");
        dateTo = format(endOfMonth(lastMonth), "yyyy-MM-dd");
        break;
      case "last_30_days":
        dateFrom = format(subDays(now, 30), "yyyy-MM-dd");
        dateTo = format(now, "yyyy-MM-dd");
        break;
      case "this_year":
        dateFrom = format(startOfYear(now), "yyyy-MM-dd");
        dateTo = format(endOfYear(now), "yyyy-MM-dd");
        break;
    }

    onFiltersChange({ dateFrom, dateTo, periodPreset: preset });
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  const filteredCarriers = carriers.filter(c => 
    c.name.toLowerCase().includes(searchCarrier.toLowerCase())
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn(
            "relative gap-2 transition-all",
            activeFiltersCount > 0 && "border-primary bg-primary/5"
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFiltersCount > 0 && (
            <Badge 
              variant="default" 
              className="h-5 min-w-5 px-1.5 text-[10px] absolute -top-2 -right-2"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[min(400px,calc(100vw-2rem))] p-0 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl" 
        align="start"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="font-semibold">Geavanceerde filters</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-6">
            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Periode
              </Label>
              <div className="flex flex-wrap gap-2">
                {datePresets.map((preset) => (
                  <Badge
                    key={preset.id}
                    variant={filters.periodPreset === preset.id ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => handleDatePreset(preset.id)}
                  >
                    {preset.label}
                  </Badge>
                ))}
              </div>
              {filters.periodPreset === "custom" && (
                <div className="flex gap-2 mt-2">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                Status
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {statusOptions.map((status) => (
                  <div
                    key={status.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                      filters.status === status.id 
                        ? "border-primary bg-primary/10" 
                        : "border-border/50 hover:border-primary/50"
                    )}
                    onClick={() => onFiltersChange({ status: status.id })}
                  >
                    <span className={cn("w-2 h-2 rounded-full", status.color)} />
                    <span className="text-xs">{status.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Customer with search */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                Klant
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Zoek klant..."
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
              <ScrollArea className="h-[120px] border rounded-lg p-2">
                <div className="space-y-1">
                  <div
                    className={cn(
                      "flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-colors",
                      filters.customer === "all" ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                    onClick={() => onFiltersChange({ customer: "all" })}
                  >
                    Alle klanten
                  </div>
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-colors truncate",
                        filters.customer === customer.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                      onClick={() => onFiltersChange({ customer: customer.id })}
                    >
                      {customer.name}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Carrier with search */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="h-3.5 w-3.5" />
                Charter
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Zoek charter..."
                  value={searchCarrier}
                  onChange={(e) => setSearchCarrier(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
              <ScrollArea className="h-[120px] border rounded-lg p-2">
                <div className="space-y-1">
                  <div
                    className={cn(
                      "flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-colors",
                      filters.carrier === "all" ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                    onClick={() => onFiltersChange({ carrier: "all" })}
                  >
                    Alle charters
                  </div>
                  {filteredCarriers.map((carrier) => (
                    <div
                      key={carrier.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer text-xs transition-colors truncate",
                        filters.carrier === carrier.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                      onClick={() => onFiltersChange({ carrier: carrier.id })}
                    >
                      {carrier.name}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Margin Range */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Euro className="h-3.5 w-3.5" />
                Marge bereik (%)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.marginMin ?? ""}
                  onChange={(e) => onFiltersChange({ marginMin: e.target.value ? Number(e.target.value) : undefined })}
                  className="text-xs h-9"
                />
                <span className="flex items-center text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.marginMax ?? ""}
                  onChange={(e) => onFiltersChange({ marginMax: e.target.value ? Number(e.target.value) : undefined })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Vehicle & Product */}
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Voertuig</Label>
                <Select value={filters.vehicle} onValueChange={(v) => onFiltersChange({ vehicle: v })}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Alle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle voertuigen</SelectItem>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Product</Label>
                <Select value={filters.product} onValueChange={(v) => onFiltersChange({ product: v })}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Alle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle producten</SelectItem>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/50 bg-muted/30">
          <Button 
            className="w-full" 
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            Filters toepassen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdvancedFiltersPanel;
