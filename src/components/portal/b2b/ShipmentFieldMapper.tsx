import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, HelpCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldMapping, TargetField } from "@/lib/shipment-field-matching";

interface ShipmentFieldMapperProps {
  sourceHeaders: string[];
  targetFields: TargetField[];
  mappings: FieldMapping[];
  onMappingChange: (index: number, targetKey: string | null) => void;
  onConfirm: () => void;
  sampleData?: string[][];
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        {Math.round(confidence * 100)}%
      </Badge>
    );
  }
  if (confidence >= 0.5) {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
        <AlertTriangle className="h-3 w-3" />
        {Math.round(confidence * 100)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-muted-foreground/30 bg-muted/50 text-muted-foreground text-xs">
      <HelpCircle className="h-3 w-3" />
      Niet herkend
    </Badge>
  );
}

export function ShipmentFieldMapper({
  sourceHeaders,
  targetFields,
  mappings,
  onMappingChange,
  onConfirm,
  sampleData,
}: ShipmentFieldMapperProps) {
  const usedTargets = new Set(mappings.filter(m => m.targetKey).map(m => m.targetKey));
  const requiredFields = targetFields.filter(f => f.required);
  const mappedRequiredCount = requiredFields.filter(f => usedTargets.has(f.key)).length;
  const allRequiredMapped = mappedRequiredCount === requiredFields.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Kolomtoewijzing</p>
          <p className="text-xs text-muted-foreground">
            {mappedRequiredCount}/{requiredFields.length} verplichte velden gekoppeld
          </p>
        </div>
        {allRequiredMapped && (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            Klaar om te importeren
          </Badge>
        )}
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 p-3 bg-muted/30 text-xs font-medium text-muted-foreground border-b border-border/50">
          <span>Bronkolom</span>
          <span />
          <span>Doelveld</span>
          <span>Match</span>
        </div>

        <div className="max-h-[320px] overflow-y-auto divide-y divide-border/30">
          {mappings.map((mapping, i) => {
            const sample = sampleData?.[0]?.[i];
            return (
              <div key={i} className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-center p-3">
                <div>
                  <p className="text-sm font-medium truncate">{mapping.sourceHeader}</p>
                  {sample && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      bv: {sample}
                    </p>
                  )}
                </div>

                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />

                <Select
                  value={mapping.targetKey || '__none__'}
                  onValueChange={(val) => onMappingChange(i, val === '__none__' ? null : val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecteer veld..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Overslaan —</SelectItem>
                    {targetFields.map(field => {
                      const isUsed = usedTargets.has(field.key) && mapping.targetKey !== field.key;
                      return (
                        <SelectItem key={field.key} value={field.key} disabled={isUsed}>
                          {field.label} {field.required ? '*' : ''}
                          {isUsed ? ' (in gebruik)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <ConfidenceBadge confidence={mapping.targetKey ? mapping.confidence : 0} />
              </div>
            );
          })}
        </div>
      </div>

      <Button
        onClick={onConfirm}
        disabled={!allRequiredMapped}
        className="w-full gap-2 bg-gold hover:bg-gold/90 text-gold-foreground"
      >
        <CheckCircle2 className="h-4 w-4" />
        Mapping bevestigen & importeren ({mappedRequiredCount}/{requiredFields.length} verplicht)
      </Button>
    </div>
  );
}
