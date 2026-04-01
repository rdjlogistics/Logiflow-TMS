import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, X } from "lucide-react";
import { Zone } from "@/hooks/useRateContractEngine";
import { Badge } from "@/components/ui/badge";

const zoneSchema = z.object({
  name: z.string().min(2, "Naam moet minimaal 2 karakters zijn"),
  match_type: z.enum(["postcode_range", "city", "country", "geo_polygon"]),
  is_active: z.boolean().default(true),
});

type ZoneFormData = z.infer<typeof zoneSchema>;

interface PostcodeRange {
  from: string;
  to: string;
}

interface EditZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: Zone | null;
  onSave: (data: Partial<Zone> & { id: string }) => Promise<void>;
  isLoading?: boolean;
}

export const EditZoneDialog: React.FC<EditZoneDialogProps> = ({
  open,
  onOpenChange,
  zone,
  onSave,
  isLoading = false,
}) => {
  const [postcodeRanges, setPostcodeRanges] = useState<PostcodeRange[]>([{ from: "", to: "" }]);
  const [cities, setCities] = useState<string[]>([]);
  const [newCity, setNewCity] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [newCountry, setNewCountry] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name: "",
      match_type: "postcode_range",
      is_active: true,
    },
  });

  useEffect(() => {
    if (zone && open) {
      reset({
        name: zone.name,
        match_type: zone.match_type,
        is_active: zone.is_active,
      });

      // Parse match_rules_json
      const rules = zone.match_rules_json as Record<string, unknown>;
      if (zone.match_type === "postcode_range" && rules.ranges) {
        const ranges = (rules.ranges as string[]).map(r => {
          const [from, to] = r.split("-");
          return { from: from || "", to: to || "" };
        });
        setPostcodeRanges(ranges.length > 0 ? ranges : [{ from: "", to: "" }]);
      } else if (zone.match_type === "city" && rules.cities) {
        setCities(rules.cities as string[]);
      } else if (zone.match_type === "country" && rules.countries) {
        setCountries(rules.countries as string[]);
      }
    }
  }, [zone, open, reset]);

  const matchType = watch("match_type");
  const isActive = watch("is_active");

  const buildMatchRules = (): Record<string, unknown> => {
    switch (matchType) {
      case "postcode_range":
        return {
          ranges: postcodeRanges
            .filter(r => r.from && r.to)
            .map(r => `${r.from}-${r.to}`),
        };
      case "city":
        return { cities };
      case "country":
        return { countries };
      case "geo_polygon": {
        const coords = (window as any).__geoCoords;
        if (Array.isArray(coords)) {
          return { coordinates: coords };
        }
        try {
          const parsed = JSON.parse(coords || "[]");
          return { coordinates: Array.isArray(parsed) ? parsed : [] };
        } catch {
          return { coordinates: [] };
        }
      }
      default:
        return {};
    }
  };

  const onSubmit = async (data: ZoneFormData) => {
    if (!zone) return;
    await onSave({
      id: zone.id,
      name: data.name,
      match_type: data.match_type,
      match_rules_json: buildMatchRules(),
      is_active: data.is_active,
    });
  };

  const addPostcodeRange = () => {
    setPostcodeRanges([...postcodeRanges, { from: "", to: "" }]);
  };

  const removePostcodeRange = (index: number) => {
    setPostcodeRanges(postcodeRanges.filter((_, i) => i !== index));
  };

  const updatePostcodeRange = (index: number, field: "from" | "to", value: string) => {
    const updated = [...postcodeRanges];
    updated[index][field] = value;
    setPostcodeRanges(updated);
  };

  const addCity = () => {
    if (newCity.trim() && !cities.includes(newCity.trim())) {
      setCities([...cities, newCity.trim()]);
      setNewCity("");
    }
  };

  const removeCity = (city: string) => {
    setCities(cities.filter(c => c !== city));
  };

  const addCountry = () => {
    if (newCountry.trim() && !countries.includes(newCountry.trim())) {
      setCountries([...countries, newCountry.trim()]);
      setNewCountry("");
    }
  };

  const removeCountry = (country: string) => {
    setCountries(countries.filter(c => c !== country));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zone Bewerken</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Zone Naam</Label>
            <Input
              id="name"
              placeholder="Zone naam"
              {...register("name")}
              error={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Match Type</Label>
            <Select
              value={matchType}
              onValueChange={(v) => setValue("match_type", v as ZoneFormData["match_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postcode_range">Postcode Range</SelectItem>
                <SelectItem value="city">Stad</SelectItem>
                <SelectItem value="country">Land</SelectItem>
                <SelectItem value="geo_polygon">Geo-polygon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Postcode Range Editor */}
          {matchType === "postcode_range" && (
            <div className="space-y-3">
              <Label>Postcode Ranges</Label>
              {postcodeRanges.map((range, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Van"
                    value={range.from}
                    onChange={(e) => updatePostcodeRange(index, "from", e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    placeholder="Tot"
                    value={range.to}
                    onChange={(e) => updatePostcodeRange(index, "to", e.target.value)}
                    className="w-24"
                  />
                  {postcodeRanges.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePostcodeRange(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addPostcodeRange}>
                <Plus className="h-4 w-4 mr-2" />
                Voeg range toe
              </Button>
            </div>
          )}

          {/* City Editor */}
          {matchType === "city" && (
            <div className="space-y-3">
              <Label>Steden</Label>
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <Badge key={city} variant="secondary" className="gap-1">
                    {city}
                    <button type="button" onClick={() => removeCity(city)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nieuwe stad"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCity())}
                />
                <Button type="button" variant="outline" onClick={addCity}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Country Editor */}
          {matchType === "country" && (
            <div className="space-y-3">
              <Label>Landen</Label>
              <div className="flex flex-wrap gap-2">
                {countries.map((country) => (
                  <Badge key={country} variant="secondary" className="gap-1">
                    {country}
                    <button type="button" onClick={() => removeCountry(country)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Land code (bijv. NL, BE, DE)"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCountry())}
                  maxLength={2}
                />
                <Button type="button" variant="outline" onClick={addCountry}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Geo Polygon Editor */}
          {matchType === "geo_polygon" && (
            <div className="space-y-3">
              <Label>GeoJSON Coördinaten</Label>
              <textarea
                className="w-full h-32 p-3 text-xs font-mono border rounded-lg bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={'Plak GeoJSON coördinaten, bijv.:\n[[4.89, 52.37], [4.90, 52.38], [4.91, 52.37], [4.89, 52.37]]'}
                value={(() => {
                  const rules = zone?.match_rules_json as Record<string, unknown>;
                  return rules?.coordinates ? JSON.stringify(rules.coordinates, null, 2) : '';
                })()}
                onChange={(e) => {
                  // Store raw text; buildMatchRules will parse it
                  try {
                    const parsed = JSON.parse(e.target.value);
                    if (Array.isArray(parsed)) {
                      // Valid — will be picked up by buildMatchRules override
                      (window as any).__geoCoords = parsed;
                    }
                  } catch {
                    // Allow typing, validation on save
                    (window as any).__geoCoords = e.target.value;
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Voer een array van [lng, lat] coördinaten in als GeoJSON polygon
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Zone Actief</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue("is_active", checked)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
