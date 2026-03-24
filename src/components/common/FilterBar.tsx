import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date';
  options?: FilterOption[];
  placeholder?: string;
}

export interface ActiveFilter {
  key: string;
  value: string;
  label: string;
  valueLabel: string;
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterField[];
  activeFilters?: ActiveFilter[];
  onFilterChange?: (key: string, value: string) => void;
  onFilterRemove?: (key: string) => void;
  onClearAll?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Zoeken...',
  filters = [],
  activeFilters = [],
  onFilterChange,
  onFilterRemove,
  onClearAll,
  actions,
  className,
}: FilterBarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search ?? ''}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-8"
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Zoekopdracht wissen"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Inline select filters (shown for ≤2 filters) */}
        {filters.length > 0 && filters.length <= 2 &&
          filters.map(filter =>
            filter.type === 'select' ? (
              <Select
                key={filter.key}
                value={activeFilters.find(f => f.key === filter.key)?.value ?? ''}
                onValueChange={v => onFilterChange?.(filter.key, v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle</SelectItem>
                  {filter.options?.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null
          )
        }

        {/* Filters popover (shown for >2 filters) */}
        {filters.length > 2 && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-1">
                    {activeFilters.length}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Filters</p>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => { onClearAll?.(); setPopoverOpen(false); }}
                    >
                      Alles wissen
                    </Button>
                  )}
                </div>
                <Separator />
                {filters.map(filter => (
                  <div key={filter.key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {filter.label}
                    </label>
                    {filter.type === 'select' && (
                      <Select
                        value={activeFilters.find(f => f.key === filter.key)?.value ?? ''}
                        onValueChange={v => onFilterChange?.(filter.key, v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={`Alle ${filter.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Alle</SelectItem>
                          {filter.options?.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {filter.type === 'text' && (
                      <Input
                        value={activeFilters.find(f => f.key === filter.key)?.value ?? ''}
                        onChange={e => onFilterChange?.(filter.key, e.target.value)}
                        placeholder={filter.placeholder ?? filter.label}
                        className="h-8 text-sm"
                      />
                    )}
                    {filter.type === 'date' && (
                      <Input
                        type="date"
                        value={activeFilters.find(f => f.key === filter.key)?.value ?? ''}
                        onChange={e => onFilterChange?.(filter.key, e.target.value)}
                        className="h-8 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Extra actions slot */}
        {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map(filter => (
            <Badge key={filter.key} variant="secondary" className="gap-1.5 pr-1">
              <span className="text-muted-foreground">{filter.label}:</span>
              {filter.valueLabel}
              <button
                onClick={() => onFilterRemove?.(filter.key)}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`${filter.label} filter verwijderen`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeFilters.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-destructive px-2"
              onClick={onClearAll}
            >
              Alles wissen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
