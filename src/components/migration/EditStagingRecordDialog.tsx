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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

interface StagingRecord {
  id: string;
  entity_type: string;
  status: string;
  source_row_json: Record<string, unknown>;
  error_list_json: string[];
  dedupe_key: string | null;
}

interface EditStagingRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: StagingRecord | null;
  onSave: (id: string, updatedJson: Record<string, unknown>) => Promise<void>;
}

export function EditStagingRecordDialog({
  open,
  onOpenChange,
  record,
  onSave,
}: EditStagingRecordDialogProps) {
  const [jsonValue, setJsonValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Update JSON value when record changes
  useState(() => {
    if (record) {
      setJsonValue(JSON.stringify(record.source_row_json, null, 2));
      setParseError(null);
    }
  });

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    try {
      JSON.parse(value);
      setParseError(null);
    } catch (e) {
      setParseError('Ongeldige JSON syntax');
    }
  };

  const handleSave = async () => {
    if (!record || parseError) return;
    
    setSaving(true);
    try {
      const parsed = JSON.parse(jsonValue);
      await onSave(record.id, parsed);
      toast({
        title: "Record bijgewerkt",
        description: `Staging record ${record.id} is succesvol opgeslagen.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fout bij opslaan",
        description: error.message || "Er ging iets mis bij het opslaan.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Staging Record Bewerken</DialogTitle>
          <DialogDescription>
            Pas de brondata aan om validatiefouten op te lossen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{record.entity_type}</Badge>
            <Badge 
              className={
                record.status === 'ERROR' 
                  ? 'bg-red-500/20 text-red-400' 
                  : record.status === 'DUPLICATE'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-blue-500/20 text-blue-400'
              }
            >
              {record.status}
            </Badge>
            {record.dedupe_key && (
              <span className="text-xs text-muted-foreground font-mono">
                Key: {record.dedupe_key}
              </span>
            )}
          </div>

          {record.error_list_json.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm font-medium text-red-400 mb-1">Validatiefouten:</p>
              <ul className="text-sm text-red-400 list-disc list-inside">
                {record.error_list_json.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label>Brondata (JSON)</Label>
            <Textarea
              value={jsonValue}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="font-mono text-sm h-64 resize-none"
              placeholder='{"field": "value"}'
            />
            {parseError && (
              <p className="text-xs text-red-500">{parseError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving || !!parseError}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
