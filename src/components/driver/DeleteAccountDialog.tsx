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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onDelete: () => Promise<void>;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  userEmail,
  onDelete,
}: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isConfirmed = confirmText.toUpperCase() === 'VERWIJDEREN';

  const handleDelete = async () => {
    if (!isConfirmed) return;
    
    setDeleting(true);
    try {
      await onDelete();
      toast({
        title: "Account verwijderd",
        description: "Je account is succesvol verwijderd. Je wordt nu uitgelogd.",
      });
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Fout bij verwijderen",
        description: error instanceof Error ? error.message : "Er ging iets mis. Neem contact op met support.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Account Verwijderen
          </AlertDialogTitle>
          <AlertDialogDescription>
            Je staat op het punt om je account permanent te verwijderen. Dit kan niet ongedaan worden gemaakt.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
            <p className="text-sm font-medium text-destructive">Dit wordt verwijderd:</p>
            <ul className="text-sm text-destructive/80 list-disc list-inside space-y-1">
              <li>Je profielgegevens</li>
              <li>Toegang tot de app</li>
              <li>Koppeling met ritten en documenten</li>
            </ul>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Let op:</strong> Sommige gegevens (ritten, facturen) worden conform wettelijke vereisten nog 7 jaar bewaard.
            </p>
          </div>

          <div className="space-y-2">
            <Label>
              Typ <strong>VERWIJDEREN</strong> om te bevestigen
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="VERWIJDEREN"
              className="font-mono"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Account: {userEmail}
          </p>
        </div>

        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setConfirmText('');
              onOpenChange(false);
            }}
          >
            Annuleren
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={deleting || !isConfirmed}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Account Verwijderen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
