import React, { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin, CheckCircle2, Upload, FileText, X } from "lucide-react";
import { geocodeAddress } from "@/utils/geocoding";
import { useToast } from "@/hooks/use-toast";
import { usePostcodeLookup, formatDutchPostcode } from "@/hooks/usePostcodeLookup";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { OptimizableStop } from "@/hooks/useAdvancedRouteOptimization";

interface AddStopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStop: (stop: OptimizableStop) => void;
}

const AddStopDialog: React.FC<AddStopDialogProps> = ({
  open,
  onOpenChange,
  onAddStop,
}) => {
  const { toast } = useToast();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { lookupPostcode, loading: postcodeLoading } = usePostcodeLookup();
  const [autoFilled, setAutoFilled] = useState(false);
  const [lastLookup, setLastLookup] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    companyName: "",
    address: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    country: "Nederland",
    stopType: "delivery" as OptimizableStop["stopType"],
    priority: "normal" as OptimizableStop["priority"],
    timeWindowStart: "",
    timeWindowEnd: "",
    serviceDuration: 15,
    notes: "",
    documentUrl: "",
    documentName: "",
  });

  const isNL = form.country === "Nederland";

  // Dutch postcode auto-complete (only for NL)
  const handlePostcodeLookup = useCallback(async () => {
    if (!isNL) return;
    const cleaned = form.postalCode.replace(/\s/g, '').toUpperCase();
    
    if (
      cleaned.length === 6 && 
      /^[1-9][0-9]{3}[A-Z]{2}$/.test(cleaned)
    ) {
      const lookupKey = cleaned + (form.houseNumber || '');
      
      if (lookupKey !== lastLookup) {
        setLastLookup(lookupKey);
        const result = await lookupPostcode(cleaned, form.houseNumber || undefined);
        
        if (result) {
          const updates: Partial<typeof form> = {};
          if (result.street && !form.address) {
            updates.address = result.street;
          }
          if (result.city && !form.city) {
            updates.city = result.city;
          }
          if (Object.keys(updates).length > 0) {
            setForm(prev => ({ ...prev, ...updates }));
            setAutoFilled(true);
            setTimeout(() => setAutoFilled(false), 3000);
          }
        }
      }
    }
  }, [form, lastLookup, lookupPostcode, isNL]);

  const handlePostcodeBlur = () => {
    if (isNL) {
      const formatted = formatDutchPostcode(form.postalCode);
      if (formatted !== form.postalCode) {
        setForm(prev => ({ ...prev, postalCode: formatted }));
      }
    }
    handlePostcodeLookup();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ title: "Bestand te groot", description: "Maximaal 10MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const stopId = crypto.randomUUID();
      const ext = file.name.split('.').pop();
      const path = `route-optimization/${stopId}/${file.name}`;

      const { error } = await supabase.storage
        .from('order-documents')
        .upload(path, file);

      if (error) throw error;

      setForm(prev => ({
        ...prev,
        documentUrl: path,
        documentName: file.name,
      }));

      toast({ title: "Document geüpload", description: file.name });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Upload mislukt", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDocument = () => {
    setForm(prev => ({ ...prev, documentUrl: "", documentName: "" }));
  };

  const handleSubmit = async () => {
    if (!form.address) {
      toast({
        title: "Adres verplicht",
        description: "Vul minimaal een straatnaam in",
        variant: "destructive",
      });
      return;
    }

    setIsGeocoding(true);

    try {
      const fullAddress = form.houseNumber
        ? `${form.address} ${form.houseNumber}`
        : form.address;
      const geocoded = await geocodeAddress(fullAddress, form.postalCode, form.city, form.country);

      const newStop: OptimizableStop = {
        id: crypto.randomUUID(),
        address: form.address,
        houseNumber: form.houseNumber || undefined,
        postalCode: form.postalCode || undefined,
        city: form.city || undefined,
        companyName: form.companyName || undefined,
        latitude: geocoded?.latitude || null,
        longitude: geocoded?.longitude || null,
        stopType: form.stopType,
        priority: form.priority,
        timeWindowStart: form.timeWindowStart
          ? new Date(`1970-01-01T${form.timeWindowStart}`).toISOString()
          : null,
        timeWindowEnd: form.timeWindowEnd
          ? new Date(`1970-01-01T${form.timeWindowEnd}`).toISOString()
          : null,
        serviceDuration: form.serviceDuration,
        notes: form.notes || undefined,
        documentUrl: form.documentUrl || undefined,
        documentName: form.documentName || undefined,
        country: form.country,
      };

      onAddStop(newStop);

      if (!geocoded) {
        toast({
          title: "Let op",
          description: "Adres kon niet worden gevonden op de kaart. Controleer het adres.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Stop toegevoegd",
          description: `${form.companyName || fullAddress} is toegevoegd aan de route`,
        });
      }

      // Reset form
      setForm({
        companyName: "",
        address: "",
        houseNumber: "",
        postalCode: "",
        city: "",
        country: "Nederland",
        stopType: "delivery",
        priority: "normal",
        timeWindowStart: "",
        timeWindowEnd: "",
        serviceDuration: 15,
        notes: "",
        documentUrl: "",
        documentName: "",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon stop niet toevoegen",
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Stop toevoegen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Bedrijfsnaam (optioneel)</Label>
            <Input
              id="companyName"
              placeholder="Naam van het bedrijf"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode" className="flex items-center gap-1.5">
                Postcode
                {isNL && <span className="text-[10px] text-primary/70 font-normal">(auto)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="postalCode"
                  placeholder={isNL ? "1234 AB" : "Postcode"}
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: isNL ? e.target.value.toUpperCase() : e.target.value })}
                  onBlur={handlePostcodeBlur}
                  maxLength={isNL ? 7 : 10}
                />
                {isNL && postcodeLoading && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {isNL && autoFilled && !postcodeLoading && (
                  <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="houseNumber">Huisnummer</Label>
              <Input
                id="houseNumber"
                placeholder="12a"
                value={form.houseNumber}
                onChange={(e) => setForm({ ...form, houseNumber: e.target.value })}
                onBlur={handlePostcodeLookup}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Plaats</Label>
              <Input
                id="city"
                placeholder="Amsterdam"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={cn(autoFilled && "border-success/50 bg-success/5")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Straat *</Label>
            <Input
              id="address"
              placeholder="Straatnaam"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={cn(autoFilled && "border-success/50 bg-success/5")}
            />
          </div>

          <div className="space-y-2">
            <Label>Land</Label>
            <Select
              value={form.country}
              onValueChange={(v) => setForm({ ...form, country: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nederland">🇳🇱 Nederland</SelectItem>
                <SelectItem value="België">🇧🇪 België</SelectItem>
                <SelectItem value="Duitsland">🇩🇪 Duitsland</SelectItem>
                <SelectItem value="Frankrijk">🇫🇷 Frankrijk</SelectItem>
                <SelectItem value="Luxemburg">🇱🇺 Luxemburg</SelectItem>
                <SelectItem value="Verenigd Koninkrijk">🇬🇧 Verenigd Koninkrijk</SelectItem>
                <SelectItem value="Polen">🇵🇱 Polen</SelectItem>
                <SelectItem value="Spanje">🇪🇸 Spanje</SelectItem>
                <SelectItem value="Italië">🇮🇹 Italië</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.stopType}
                onValueChange={(v) =>
                  setForm({ ...form, stopType: v as OptimizableStop["stopType"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Ophalen</SelectItem>
                  <SelectItem value="delivery">Afleveren</SelectItem>
                  <SelectItem value="stop">Tussenstop</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioriteit</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v as OptimizableStop["priority"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normaal</SelectItem>
                  <SelectItem value="high">Hoog</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeStart">Tijdvenster start</Label>
              <Input
                id="timeStart"
                type="time"
                value={form.timeWindowStart}
                onChange={(e) => setForm({ ...form, timeWindowStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeEnd">Tijdvenster eind</Label>
              <Input
                id="timeEnd"
                type="time"
                value={form.timeWindowEnd}
                onChange={(e) => setForm({ ...form, timeWindowEnd: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceDuration">Stoptijd (minuten)</Label>
            <Input
              id="serviceDuration"
              type="number"
              min={0}
              value={form.serviceDuration}
              onChange={(e) => setForm({ ...form, serviceDuration: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Opmerkingen (optioneel)</Label>
            <Textarea
              id="notes"
              placeholder="Bijv. bel bij aankomst, laadklep nodig, etc."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Document uploaden (optioneel)</Label>
            <p className="text-xs text-muted-foreground">Vrachtbrief, factuur of ander document (PDF, afbeelding)</p>
            {form.documentName ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm truncate flex-1">{form.documentName}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={removeDocument}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? "Uploaden..." : "Bestand kiezen"}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isGeocoding}>
            {isGeocoding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Toevoegen...
              </>
            ) : (
              "Toevoegen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStopDialog;
