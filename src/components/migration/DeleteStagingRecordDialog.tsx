import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

interface StagingRecord {
  id: string;
  entity_type: string;
  status: string;
  source_row_json: Record<string, unknown>;
}

interface DeleteStagingRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: StagingRecord | null;
  onDelete: (id: string) => Promise<void>;
}

export function DeleteStagingRecordDialog({
  open,
  onOpenChange,
  record,
  onDelete,
}: DeleteStagingRecordDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!record) return;
    
    setDeleting(true);
    try {
      await onDelete(record.id);
      toast({
        title: "Record verwijderd",
        description: `Staging record is verwijderd uit de import queue.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fout bij verwijderen",
        description: error.message || "Er ging iets mis.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!record) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Record Verwijderen</AlertDialogTitle>
          <AlertDialogDescription>
            Weet je zeker dat je dit staging record wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="flex items-center gap-2 mb-3">
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
          </div>
          <pre className="text-xs font-mono bg-muted/50 p-3 rounded overflow-x-auto max-h-32">
            {JSON.stringify(record.source_row_json, null, 2)}
          </pre>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Verwijderen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
