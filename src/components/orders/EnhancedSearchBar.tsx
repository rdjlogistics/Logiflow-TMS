import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  X,
  Clock,
  Star,
  Filter,
  Sparkles,
  MapPin,
  Building2,
  Hash,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SavedSearch {
  id: string;
  query: string;
  filters?: Record<string, any>;
  isFavorite?: boolean;
}

interface SearchSuggestion {
  type: "city" | "customer" | "order" | "filter";
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface EnhancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilterChange?: (filters: Record<string, any>) => void;
  placeholder?: string;
  recentSearches?: SavedSearch[];
  suggestions?: SearchSuggestion[];
  onSaveSearch?: (query: string) => void;
  className?: string;
}

const EnhancedSearchBar = ({
  value,
  onChange,
  onFilterChange,
  placeholder = "Zoeken op order, stad, klant... (druk /)",
  recentSearches = [],
  suggestions = [],
  onSaveSearch,
  className,
}: EnhancedSearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  // Keyboard shortcut: / to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && 
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === "filter") {
      onFilterChange?.({ [suggestion.value]: true });
    } else {
      setLocalValue(suggestion.value);
      onChange(suggestion.value);
    }
    setOpen(false);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
    inputRef.current?.focus();
  };

  const getIconForType = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "city": return <MapPin className="h-3.5 w-3.5" />;
      case "customer": return <Building2 className="h-3.5 w-3.5" />;
      case "order": return <Hash className="h-3.5 w-3.5" />;
      case "filter": return <Filter className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  // Filter suggestions based on input
  const filteredSuggestions = localValue.length > 0
    ? suggestions.filter(s => 
        s.value.toLowerCase().includes(localValue.toLowerCase()) ||
        s.label.toLowerCase().includes(localValue.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className={cn("relative", className)}>
      <Popover open={open && (focused || recentSearches.length > 0 || filteredSuggestions.length > 0)} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              ref={inputRef}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onFocus={() => { setFocused(true); setOpen(true); }}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              placeholder={placeholder}
              className={cn(
                "pl-9 pr-20 h-10 bg-background/80 backdrop-blur-sm border-border/50",
                "shadow-sm hover:shadow-md focus:shadow-lg transition-all duration-200",
                "focus:ring-2 focus:ring-primary/20"
              )}
            />
            
            {/* Right side actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <AnimatePresence>
                {localValue && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleClear}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!focused && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 text-muted-foreground">
                  <Keyboard className="h-2.5 w-2.5" />
                  /
                </Badge>
              )}
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command className="rounded-lg border-0">
            <CommandList className="max-h-[300px]">
              {/* AI suggestion */}
              {localValue.length > 2 && (
                <CommandGroup heading="AI Suggestie">
                  <CommandItem className="gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span>Zoek orders met "{localValue}" in route</span>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Filtered suggestions */}
              {filteredSuggestions.length > 0 && (
                <CommandGroup heading="Suggesties">
                  {filteredSuggestions.map((suggestion) => (
                    <CommandItem
                      key={`${suggestion.type}-${suggestion.value}`}
                      onSelect={() => handleSelect(suggestion)}
                      className="gap-2"
                    >
                      {suggestion.icon || getIconForType(suggestion.type)}
                      <span>{suggestion.label}</span>
                      <Badge variant="outline" className="ml-auto text-[9px] px-1">
                        {suggestion.type}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Recent searches */}
              {recentSearches.length > 0 && !localValue && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Recente zoekopdrachten">
                    {recentSearches.slice(0, 5).map((search) => (
                      <CommandItem
                        key={search.id}
                        onSelect={() => {
                          setLocalValue(search.query);
                          onChange(search.query);
                          setOpen(false);
                        }}
                        className="gap-2"
                      >
                        {search.isFavorite ? (
                          <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span>{search.query}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {!localValue && filteredSuggestions.length === 0 && recentSearches.length === 0 && (
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  Begin met typen om te zoeken...
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EnhancedSearchBar;
