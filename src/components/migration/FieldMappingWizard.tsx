import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, ArrowRight, Check, X, Sparkles, RefreshCcw } from "lucide-react";
import { ParsedFile } from "./FileUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Target field definitions per entity type
const TARGET_FIELDS: Record<string, { field: string; label: string; required: boolean; type: string }[]> = {
  CUSTOMER: [
    { field: "company_name", label: "Bedrijfsnaam", required: true, type: "string" },
    { field: "contact_name", label: "Contactpersoon", required: false, type: "string" },
    { field: "email", label: "Email", required: false, type: "email" },
    { field: "phone", label: "Telefoon", required: false, type: "string" },
    { field: "address", label: "Adres", required: false, type: "string" },
    { field: "city", label: "Stad", required: false, type: "string" },
    { field: "postal_code", label: "Postcode", required: false, type: "string" },
    { field: "country", label: "Land", required: false, type: "string" },
    { field: "vat_number", label: "BTW Nummer", required: false, type: "string" },
    { field: "kvk_number", label: "KVK Nummer", required: false, type: "string" },
  ],
  ADDRESS: [
    { field: "label", label: "Label/Naam", required: true, type: "string" },
    { field: "street", label: "Straat", required: true, type: "string" },
    { field: "house_number", label: "Huisnummer", required: false, type: "string" },
    { field: "postal_code", label: "Postcode", required: false, type: "string" },
    { field: "city", label: "Stad", required: false, type: "string" },
    { field: "country", label: "Land", required: false, type: "string" },
    { field: "contact_name", label: "Contactpersoon", required: false, type: "string" },
    { field: "phone", label: "Telefoon", required: false, type: "string" },
  ],
  VEHICLE: [
    { field: "license_plate", label: "Kenteken", required: true, type: "string" },
    { field: "brand", label: "Merk", required: false, type: "string" },
    { field: "model", label: "Model", required: false, type: "string" },
    { field: "type", label: "Type", required: false, type: "string" },
    { field: "vin_number", label: "VIN Nummer", required: false, type: "string" },
    { field: "year", label: "Bouwjaar", required: false, type: "number" },
    { field: "max_weight_kg", label: "Max Gewicht (kg)", required: false, type: "number" },
    { field: "max_volume_m3", label: "Max Volume (m³)", required: false, type: "number" },
  ],
  ORDER: [
    { field: "reference", label: "Referentie", required: true, type: "string" },
    { field: "customer_name", label: "Klantnaam", required: false, type: "string" },
    { field: "pickup_address", label: "Ophaaladres", required: false, type: "string" },
    { field: "delivery_address", label: "Afleveradres", required: false, type: "string" },
    { field: "pickup_date", label: "Ophaaldatum", required: false, type: "date" },
    { field: "delivery_date", label: "Afleverdatum", required: false, type: "date" },
    { field: "weight_kg", label: "Gewicht (kg)", required: false, type: "number" },
    { field: "volume_m3", label: "Volume (m³)", required: false, type: "number" },
    { field: "price", label: "Prijs", required: false, type: "number" },
    { field: "status", label: "Status", required: false, type: "string" },
  ],
  INVOICE: [
    { field: "invoice_number", label: "Factuurnummer", required: true, type: "string" },
    { field: "customer_name", label: "Klantnaam", required: false, type: "string" },
    { field: "invoice_date", label: "Factuurdatum", required: false, type: "date" },
    { field: "due_date", label: "Vervaldatum", required: false, type: "date" },
    { field: "subtotal", label: "Subtotaal", required: false, type: "number" },
    { field: "vat_amount", label: "BTW Bedrag", required: false, type: "number" },
    { field: "total_amount", label: "Totaalbedrag", required: true, type: "number" },
    { field: "status", label: "Status", required: false, type: "string" },
  ],
  TRANSACTION: [
    { field: "reference", label: "Referentie", required: true, type: "string" },
    { field: "amount", label: "Bedrag", required: true, type: "number" },
    { field: "transaction_date", label: "Transactiedatum", required: true, type: "date" },
    { field: "description", label: "Omschrijving", required: false, type: "string" },
    { field: "counterparty", label: "Tegenpartij", required: false, type: "string" },
    { field: "type", label: "Type", required: false, type: "string" },
  ],
};

interface FieldMapping {
  sourceField: string;
  targetField: string | null;
  confidence: number;
  suggestion?: string;
}

interface FieldMappingWizardProps {
  parsedFile: ParsedFile;
  entityType: string;
  onMappingComplete: (mapping: Record<string, string>, normalizedData: Record<string, any>[]) => void;
  onCancel: () => void;
}

export function FieldMappingWizard({
  parsedFile,
  entityType,
  onMappingComplete,
  onCancel,
}: FieldMappingWizardProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const { toast } = useToast();

  const targetFields = TARGET_FIELDS[entityType] || [];

  // Simple heuristic matching for suggestions
  const generateLocalSuggestions = (sourceHeaders: string[]) => {
    const suggestions: FieldMapping[] = sourceHeaders.map((header) => {
      const normalizedHeader = header.toLowerCase().replace(/[_\-\s]+/g, "");
      
      let bestMatch: { field: string; confidence: number } | null = null;
      
      for (const target of targetFields) {
        const normalizedTarget = target.field.toLowerCase().replace(/[_\-\s]+/g, "");
        const normalizedLabel = target.label.toLowerCase().replace(/[_\-\s]+/g, "");
        
        // Exact match
        if (normalizedHeader === normalizedTarget || normalizedHeader === normalizedLabel) {
          bestMatch = { field: target.field, confidence: 95 };
          break;
        }
        
        // Partial match
        if (normalizedHeader.includes(normalizedTarget) || normalizedTarget.includes(normalizedHeader)) {
          const score = 70 + (Math.min(normalizedHeader.length, normalizedTarget.length) / Math.max(normalizedHeader.length, normalizedTarget.length)) * 20;
          if (!bestMatch || score > bestMatch.confidence) {
            bestMatch = { field: target.field, confidence: Math.round(score) };
          }
        }
        
        // Common aliases
        const aliases: Record<string, string[]> = {
          company_name: ["bedrijf", "naam", "klant", "company", "name", "customer"],
          email: ["mail", "emailadres", "e-mail"],
          phone: ["telefoon", "tel", "gsm", "mobile"],
          address: ["adres", "straat", "street"],
          city: ["plaats", "stad", "woonplaats"],
          postal_code: ["postcode", "zip", "pc"],
          reference: ["ref", "ordernr", "ordernummer", "factuurnr"],
          total_amount: ["totaal", "bedrag", "amount", "total"],
          license_plate: ["kenteken", "nummerplaat", "plate"],
        };
        
        if (aliases[target.field]?.some(alias => normalizedHeader.includes(alias))) {
          if (!bestMatch || 75 > bestMatch.confidence) {
            bestMatch = { field: target.field, confidence: 75 };
          }
        }
      }
      
      return {
        sourceField: header,
        targetField: bestMatch?.field || null,
        confidence: bestMatch?.confidence || 0,
        suggestion: bestMatch?.field,
      };
    });
    
    return suggestions;
  };

  // Get AI suggestions from edge function
  const fetchAISuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("migration-field-mapper", {
        body: {
          sourceHeaders: parsedFile.headers,
          sampleRows: parsedFile.rows.slice(0, 5),
          entityType,
          targetFields: targetFields.map(t => ({ field: t.field, label: t.label })),
        },
      });

      if (error) throw error;

      if (data?.mappings) {
        setMappings(prev => prev.map(m => {
          const aiSuggestion = data.mappings.find((s: any) => s.sourceField === m.sourceField);
          if (aiSuggestion) {
            return {
              ...m,
              targetField: aiSuggestion.targetField || m.targetField,
              confidence: aiSuggestion.confidence || m.confidence,
              suggestion: aiSuggestion.targetField,
            };
          }
          return m;
        }));
        toast({ title: "AI suggesties geladen", description: "Velden zijn automatisch gematcht" });
      }
    } catch (error: any) {
      console.error("AI suggestions error:", error);
      // Fall back to local suggestions - already loaded
      toast({ 
        title: "Lokale suggesties gebruikt", 
        description: "AI suggesties niet beschikbaar, lokale matching toegepast",
        variant: "default" 
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    // Start with local suggestions
    const localSuggestions = generateLocalSuggestions(parsedFile.headers);
    setMappings(localSuggestions);
    
    // Then try to get AI suggestions
    fetchAISuggestions();
  }, [parsedFile.headers, entityType]);

  const updateMapping = (sourceField: string, targetField: string | null) => {
    setMappings(prev => prev.map(m => 
      m.sourceField === sourceField 
        ? { ...m, targetField, confidence: targetField ? 100 : 0 }
        : m
    ));
  };

  const handleComplete = () => {
    const mappingRecord: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.targetField) {
        mappingRecord[m.sourceField] = m.targetField;
      }
    });

    // Check required fields
    const missingRequired = targetFields
      .filter(t => t.required)
      .filter(t => !Object.values(mappingRecord).includes(t.field));
    
    if (missingRequired.length > 0) {
      toast({
        title: "Verplichte velden ontbreken",
        description: `Koppel nog: ${missingRequired.map(f => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Transform data according to mapping
    const normalizedData = parsedFile.rows.map(row => {
      const normalized: Record<string, any> = {};
      Object.entries(mappingRecord).forEach(([source, target]) => {
        normalized[target] = row[source];
      });
      return normalized;
    });

    onMappingComplete(mappingRecord, normalizedData);
  };

  const mappedCount = mappings.filter(m => m.targetField).length;
  const requiredMapped = targetFields
    .filter(t => t.required)
    .every(t => mappings.some(m => m.targetField === t.field));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Veld Mapping
            </CardTitle>
            <CardDescription>
              Koppel bronvelden aan doelvelden. {mappedCount}/{parsedFile.headers.length} gekoppeld
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAISuggestions}
            disabled={isLoadingSuggestions}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoadingSuggestions ? "animate-spin" : ""}`} />
            AI Suggesties
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview of data */}
        <div className="rounded-lg border p-3 bg-muted/50">
          <p className="text-sm font-medium mb-2">Data preview ({parsedFile.rowCount} rijen)</p>
          <ScrollArea className="h-24">
            <Table>
              <TableHeader>
                <TableRow>
                  {parsedFile.headers.slice(0, 6).map(h => (
                    <TableHead key={h} className="text-xs">{h}</TableHead>
                  ))}
                  {parsedFile.headers.length > 6 && (
                    <TableHead className="text-xs">+{parsedFile.headers.length - 6} meer</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedFile.rows.slice(0, 2).map((row, i) => (
                  <TableRow key={i}>
                    {parsedFile.headers.slice(0, 6).map(h => (
                      <TableCell key={h} className="text-xs truncate max-w-[100px]">
                        {String(row[h] || "-")}
                      </TableCell>
                    ))}
                    {parsedFile.headers.length > 6 && <TableCell className="text-xs">...</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Mapping table */}
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bronveld</TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead>Doelveld</TableHead>
                <TableHead>Vertrouwen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.sourceField}>
                  <TableCell className="font-medium">
                    <div>
                      <span>{mapping.sourceField}</span>
                      {mapping.suggestion && mapping.suggestion !== mapping.targetField && (
                        <div className="flex items-center gap-1 mt-1">
                          <Lightbulb className="h-3 w-3 text-amber-500" />
                          <span className="text-xs text-muted-foreground">
                            Suggestie: {targetFields.find(t => t.field === mapping.suggestion)?.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.targetField || ""}
                      onValueChange={(v) => updateMapping(mapping.sourceField, v || null)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecteer veld..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Niet koppelen</SelectItem>
                        {targetFields.map((field) => (
                          <SelectItem key={field.field} value={field.field}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mapping.targetField && (
                      <Badge 
                        variant="outline" 
                        className={
                          mapping.confidence >= 90 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : mapping.confidence >= 70
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-muted"
                        }
                      >
                        {mapping.confidence}%
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Required fields indicator */}
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium mb-2">Verplichte velden</p>
          <div className="flex flex-wrap gap-2">
            {targetFields.filter(t => t.required).map(field => {
              const isMapped = mappings.some(m => m.targetField === field.field);
              return (
                <Badge 
                  key={field.field}
                  variant="outline"
                  className={isMapped ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}
                >
                  {isMapped ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                  {field.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Annuleren
          </Button>
          <Button onClick={handleComplete} disabled={!requiredMapped}>
            Mapping Toepassen & Importeren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
