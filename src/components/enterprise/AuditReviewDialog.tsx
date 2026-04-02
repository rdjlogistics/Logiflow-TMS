import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertTriangle, FileSearch, Loader2 } from "lucide-react";

interface AuditItem {
  type: string;
  order: string;
  amount: string;
  severity: string;
}

interface AuditReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AuditItem | null;
  onResolve?: (item: AuditItem, resolution: string, notes: string) => void;
}

export function AuditReviewDialog({ open, onOpenChange, item, onResolve }: AuditReviewDialogProps) {
  const [resolution, setResolution] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!item || !resolution) return;
    
    setIsSubmitting(true);
    try {
      await onResolve?.(item, resolution, notes);
      toast({
        title: "Audit item afgehandeld ✓",
        description: `Order ${item.order} is gemarkeerd als "${resolution}".`
      });
      setResolution("");
      setNotes("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Audit Review
          </DialogTitle>
          <DialogDescription>
            Beoordeel en verwerk dit audit item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Details */}
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="font-medium">{item.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order</span>
              <span className="font-mono">{item.order}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Afwijking</span>
              <span className="font-medium">{item.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Severity</span>
              <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "default" : "secondary"}>
                {item.severity.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <Label>Beslissing</Label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer beslissing..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Goedkeuren - afwijking accepteren
                  </span>
                </SelectItem>
                <SelectItem value="corrected">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Gecorrigeerd - fout in systeem hersteld
                  </span>
                </SelectItem>
                <SelectItem value="rejected">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-500" />
                    Afwijzen - dispute openen
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notities (optioneel)</Label>
            <Textarea 
              placeholder="Voeg eventuele opmerkingen toe..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={!resolution || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Afhandelen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
