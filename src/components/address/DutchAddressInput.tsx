import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, MapPin } from "lucide-react";
import { usePostcodeLookup, formatDutchPostcode } from "@/hooks/usePostcodeLookup";
import { cn } from "@/lib/utils";

interface DutchAddressInputProps {
  postalCode: string;
  houseNumber: string;
  street: string;
  city: string;
  country?: string;
  onPostalCodeChange: (value: string) => void;
  onHouseNumberChange: (value: string) => void;
  onStreetChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCountryChange?: (value: string) => void;
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}

const DutchAddressInput = ({
  postalCode,
  houseNumber,
  street,
  city,
  country = "Nederland",
  onPostalCodeChange,
  onHouseNumberChange,
  onStreetChange,
  onCityChange,
  onCountryChange,
  showLabels = true,
  compact = false,
  className,
  disabled = false,
}: DutchAddressInputProps) => {
  const { lookupPostcode, loading } = usePostcodeLookup();
  const [autoFilled, setAutoFilled] = useState(false);
  const [lastLookup, setLastLookup] = useState<string>("");
  const [apiCity, setApiCity] = useState<string | null>(null);
  const [cityMismatch, setCityMismatch] = useState<string | null>(null);

  // Auto-lookup when postcode is complete and valid
  const handlePostcodeBlur = useCallback(async () => {
    const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
    
    // Only lookup if it's a valid Dutch postcode and we haven't looked it up yet
    if (cleaned.length === 6 && /^[1-9][0-9]{3}[A-Z]{2}$/.test(cleaned)) {
      const lookupKey = `${cleaned}-${houseNumber}`;
      
      if (lookupKey !== lastLookup) {
        setLastLookup(lookupKey);
        const result = await lookupPostcode(cleaned, houseNumber);
        
        if (result) {
          if (result.street) {
            onStreetChange(result.street);
          }
          if (result.city) {
            setApiCity(result.city);
            setCityMismatch(null);
            onCityChange(result.city);
          }
          setAutoFilled(true);
          
          // Reset autofilled indicator after 3 seconds
          setTimeout(() => setAutoFilled(false), 3000);
        }
      }
    }
  }, [postalCode, houseNumber, street, city, lastLookup, lookupPostcode, onStreetChange, onCityChange]);

  // Also trigger lookup when house number changes (if postcode is valid)
  const handleHouseNumberBlur = useCallback(async () => {
    if (houseNumber && postalCode.replace(/\s/g, '').length === 6) {
      await handlePostcodeBlur();
    }
  }, [houseNumber, postalCode, handlePostcodeBlur]);

  // Format postcode on blur
  const handlePostcodeFormat = () => {
    const formatted = formatDutchPostcode(postalCode);
    if (formatted !== postalCode) {
      onPostalCodeChange(formatted);
    }
    handlePostcodeBlur();
  };

  // Check if it's a Dutch address (enable auto-complete)
  const isDutchAddress = country === "Nederland" || country === "NL" || country === "netherlands";

  const inputHeight = compact ? "h-8" : "h-9";
  const textSize = compact ? "text-xs" : "text-sm";
  const labelSize = compact ? "text-xs" : "text-sm";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Row 1: Postcode + House Number */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-1">
          {showLabels && (
            <Label className={cn(labelSize, "text-muted-foreground flex items-center gap-1.5")}>
              Postcode
              {isDutchAddress && (
                <span className="text-[10px] text-primary/70 font-normal">(auto)</span>
              )}
            </Label>
          )}
          <div className="relative">
            <Input
              value={postalCode}
              onChange={(e) => onPostalCodeChange(e.target.value.toUpperCase())}
              onBlur={handlePostcodeFormat}
              placeholder="1234 AB"
              className={cn(inputHeight, textSize, "pr-8")}
              maxLength={7}
              disabled={disabled}
            />
            {loading && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {autoFilled && !loading && (
              <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          {showLabels && (
            <Label className={cn(labelSize, "text-muted-foreground")}>Huisnr</Label>
          )}
          <Input
            value={houseNumber}
            onChange={(e) => onHouseNumberChange(e.target.value)}
            onBlur={handleHouseNumberBlur}
            placeholder="123"
            className={cn(inputHeight, textSize)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Row 2: Street + City (auto-filled) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-1">
          {showLabels && (
            <Label className={cn(labelSize, "text-muted-foreground flex items-center gap-1.5")}>
              Straat
              {autoFilled && <MapPin className="h-3 w-3 text-success" />}
            </Label>
          )}
          <Input
            value={street}
            onChange={(e) => onStreetChange(e.target.value)}
            placeholder="Straatnaam"
            className={cn(
              inputHeight, 
              textSize,
              autoFilled && "border-success/50 bg-success/5"
            )}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          {showLabels && (
            <Label className={cn(labelSize, "text-muted-foreground flex items-center gap-1.5")}>
              Plaats
              {autoFilled && <MapPin className="h-3 w-3 text-success" />}
            </Label>
          )}
          <Input
            value={city}
            onChange={(e) => {
              const val = e.target.value;
              onCityChange(val);
              if (apiCity && val && val.toLowerCase() !== apiCity.toLowerCase()) {
                setCityMismatch(apiCity);
              } else {
                setCityMismatch(null);
              }
            }}
            placeholder="Plaatsnaam"
            className={cn(
              inputHeight, 
              textSize,
              autoFilled && "border-success/50 bg-success/5",
              cityMismatch && "border-yellow-500/50"
            )}
            disabled={disabled}
          />
          {cityMismatch && (
            <p className="text-[11px] text-yellow-600 dark:text-yellow-400 mt-0.5">
              De postcode hoort bij {cityMismatch}, niet {city}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DutchAddressInput;
