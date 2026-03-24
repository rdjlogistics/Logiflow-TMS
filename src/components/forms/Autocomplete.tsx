import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X, Loader2, Check } from 'lucide-react';

interface AutocompleteOption<T> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface AutocompleteProps<T> {
  options: AutocompleteOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  // Allow free text input
  freeSolo?: boolean;
  // Render custom option
  renderOption?: (option: AutocompleteOption<T>, isHighlighted: boolean) => React.ReactNode;
  // No options message
  noOptionsMessage?: string;
  // Create new option
  onCreate?: (inputValue: string) => void;
  createLabel?: string;
}

export function Autocomplete<T extends string | number>({
  options,
  value,
  onChange,
  onSearch,
  placeholder = 'Zoeken...',
  className,
  disabled = false,
  loading = false,
  clearable = true,
  freeSolo = false,
  renderOption,
  noOptionsMessage = 'Geen resultaten',
  onCreate,
  createLabel = 'Toevoegen',
}: AutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get selected option label
  const selectedOption = options.find((o) => o.value === value);

  // Filter options based on input
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Show create option
  const showCreate = onCreate && inputValue && !filteredOptions.some(
    (o) => o.label.toLowerCase() === inputValue.toLowerCase()
  );

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setHighlightedIndex(-1);
    onSearch?.(newValue);
    
    if (!isOpen) {
      setIsOpen(true);
    }
  }, [isOpen, onSearch]);

  // Handle option select
  const handleSelect = useCallback((option: AutocompleteOption<T>) => {
    if (option.disabled) return;
    
    onChange(option.value);
    setInputValue(option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onChange]);

  // Handle create
  const handleCreate = useCallback(() => {
    onCreate?.(inputValue);
    setIsOpen(false);
  }, [onCreate, inputValue]);

  // Handle clear
  const handleClear = useCallback(() => {
    onChange(null);
    setInputValue('');
    inputRef.current?.focus();
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const totalOptions = filteredOptions.length + (showCreate ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % totalOptions);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex]);
          } else if (showCreate) {
            handleCreate();
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [filteredOptions, highlightedIndex, showCreate, handleSelect, handleCreate]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-option]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync input value with selected option
  useEffect(() => {
    if (selectedOption && !isOpen) {
      setInputValue(selectedOption.label);
    }
  }, [selectedOption, isOpen]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-8"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {clearable && value && !loading && (
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-muted rounded"
              type="button"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.1 }}
            className="absolute z-50 w-full mt-1 py-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {filteredOptions.length === 0 && !showCreate && (
              <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                {noOptionsMessage}
              </div>
            )}

            {filteredOptions.map((option, index) => {
              const isHighlighted = index === highlightedIndex;
              const isSelected = option.value === value;

              if (renderOption) {
                return (
                  <div
                    key={String(option.value)}
                    data-option
                    onClick={() => handleSelect(option)}
                  >
                    {renderOption(option, isHighlighted)}
                  </div>
                );
              }

              return (
                <button
                  key={String(option.value)}
                  data-option
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={option.disabled}
                  className={cn(
                    "w-full px-3 py-2 text-left flex items-center gap-3 text-sm",
                    isHighlighted && "bg-muted",
                    isSelected && "bg-primary/10",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {option.icon}
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{option.label}</p>
                    {option.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </p>
                    )}
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}

            {showCreate && (
              <button
                data-option
                type="button"
                onClick={handleCreate}
                className={cn(
                  "w-full px-3 py-2 text-left flex items-center gap-2 text-sm text-primary",
                  highlightedIndex === filteredOptions.length && "bg-muted"
                )}
              >
                + {createLabel}: "{inputValue}"
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
