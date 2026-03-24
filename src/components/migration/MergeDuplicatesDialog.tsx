import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Merge, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StagingRecord {
  id: string;
  entity_type: string;
  status: string;
  source_row_json: Record<string, unknown>;
  error_list_json: string[];
  dedupe_key: string | null;
}

interface MergeDuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: StagingRecord | null;
  duplicates: StagingRecord[];
  onMerge: (masterId: string, duplicateIds: string[]) => Promise<void>;
}

export function MergeDuplicatesDialog({
  open,
  onOpenChange,
  record,
  duplicates,
  onMerge,
}: MergeDuplicatesDialogProps) {
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const allRecords = record ? [record, ...duplicates] : duplicates;

  const handleMerge = async () => {
    if (!selectedMaster || !record) return;
    
    setMerging(true);
    try {
      const duplicateIds = allRecords
        .filter(r => r.id !== selectedMaster)
        .map(r => r.id);
      
      await onMerge(selectedMaster, duplicateIds);
      
      toast({
        title: "Duplicaten samengevoegd",
        description: `${duplicateIds.length} record(s) samengevoegd met master record.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fout bij samenvoegen",
        description: error.message || "Er ging iets mis.",
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Duplicaten Samenvoegen
          </DialogTitle>
          <DialogDescription>
            Selecteer het master record. Andere records worden gemarkeerd als duplicaat en overgeslagen.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">{record.entity_type}</Badge>
            {record.dedupe_key && (
              <span className="text-sm text-muted-foreground">
                Dedupe Key: <code className="font-mono">{record.dedupe_key}</code>
              </span>
            )}
          </div>

          <RadioGroup value={selectedMaster || ''} onValueChange={setSelectedMaster}>
            <div className="space-y-3">
              {allRecords.map((rec, index) => (
                <Card 
                  key={rec.id}
                  className={`cursor-pointer transition-colors ${
                    selectedMaster === rec.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setSelectedMaster(rec.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={rec.id} id={rec.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Label htmlFor={rec.id} className="font-medium cursor-pointer">
                            Record {index + 1}
                          </Label>
                          {rec.status === 'ERROR' && (
                            <Badge className="bg-red-500/20 text-red-400 text-xs">Fout</Badge>
                          )}
                          {rec.error_list_json.length === 0 && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Valide
                            </Badge>
                          )}
                        </div>
                        <pre className="text-xs font-mono bg-muted/50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(rec.source_row_json, null, 2)}
                        </pre>
                        {rec.error_list_json.length > 0 && (
                          <div className="mt-2 text-xs text-red-400">
                            Fouten: {rec.error_list_json.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleMerge} disabled={merging || !selectedMaster}>
            {merging ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Merge className="h-4 w-4 mr-2" />
            )}
            Samenvoegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
