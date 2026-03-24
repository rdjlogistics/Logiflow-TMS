import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Calendar, Filter, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InvoiceFiltersState {
  status: string;
  customer_id: string;
  period_from: string;
  period_to: string;
  email_status: string;
  search: string;
}

interface InvoiceFiltersProps {
  filters: InvoiceFiltersState;
  onFiltersChange: (filters: InvoiceFiltersState) => void;
}

const statusOptions = [
  { value: "all", label: "Alle statussen" },
  { value: "concept", label: "Concept" },
  { value: "verzonden", label: "Verzonden" },
  { value: "betaald", label: "Betaald" },
  { value: "vervallen", label: "Vervallen" },
  { value: "proforma", label: "Proforma" },
];

const emailStatusOptions = [
  { value: "all", label: "Alle" },
  { value: "sent", label: "Verzonden" },
  { value: "not_sent", label: "Niet verzonden" },
];

const periodPresets = [
  { value: "this_month", label: "Deze maand" },
  { value: "last_month", label: "Vorige maand" },
  { value: "this_quarter", label: "Dit kwartaal" },
  { value: "last_quarter", label: "Vorig kwartaal" },
  { value: "this_year", label: "Dit jaar" },
  { value: "last_year", label: "Vorig jaar" },
  { value: "custom", label: "Aangepast" },
];

export function InvoiceFilters({ filters, onFiltersChange }: InvoiceFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [periodPreset, setPeriodPreset] = useState("this_month");

  // Fetch customers for filter
  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, company_name")
        .eq("is_active", true)
        .order("company_name");
      return data || [];
    },
  });

  // Apply period preset
  const applyPeriodPreset = (preset: string) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (preset) {
      case "this_month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last_month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "this_quarter": {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), currentQuarter * 3, 1);
        to = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      }
      case "last_quarter": {
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const quarter = lastQuarter < 0 ? 3 : lastQuarter;
        from = new Date(year, quarter * 3, 1);
        to = new Date(year, (quarter + 1) * 3, 0);
        break;
      }
      case "this_year":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
      case "last_year":
        from = new Date(now.getFullYear() - 1, 0, 1);
        to = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }

    setPeriodPreset(preset);
    onFiltersChange({
      ...filters,
      period_from: from.toISOString().split("T")[0],
      period_to: to.toISOString().split("T")[0],
    });
  };

  // Calculate active filter count
  const activeFilterCount = [
    filters.status !== "all",
    filters.customer_id !== "",
    filters.email_status !== "all",
    filters.period_from !== "" || filters.period_to !== "",
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFiltersChange({
      status: "all",
      customer_id: "",
      period_from: "",
      period_to: "",
      email_status: "all",
      search: filters.search, // Keep search
    });
    setPeriodPreset("this_month");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Input
          placeholder="Zoek op factuurnummer of klant..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-4"
        />
      </div>

      {/* Status Quick Filter */}
      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Advanced Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Geavanceerde filters</h4>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>

            {/* Customer Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Klant</label>
              <Select
                value={filters.customer_id || "all"}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, customer_id: value === "all" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle klanten" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle klanten</SelectItem>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email status</label>
              <Select
                value={filters.email_status}
                onValueChange={(value) => onFiltersChange({ ...filters, email_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Periode</label>
              <div className="flex flex-wrap gap-1">
                {periodPresets.slice(0, 4).map((preset) => (
                  <Button
                    key={preset.value}
                    variant={periodPreset === preset.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyPeriodPreset(preset.value)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {periodPresets.slice(4, 6).map((preset) => (
                  <Button
                    key={preset.value}
                    variant={periodPreset === preset.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyPeriodPreset(preset.value)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Aangepaste periode</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.period_from}
                  onChange={(e) => {
                    setPeriodPreset("custom");
                    onFiltersChange({ ...filters, period_from: e.target.value });
                  }}
                  placeholder="Van"
                />
                <Input
                  type="date"
                  value={filters.period_to}
                  onChange={(e) => {
                    setPeriodPreset("custom");
                    onFiltersChange({ ...filters, period_to: e.target.value });
                  }}
                  placeholder="T/m"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
