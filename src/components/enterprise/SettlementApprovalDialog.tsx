import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { FileSpreadsheet, Download, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface Settlement {
  id: string;
  carrier: string;
  period: string;
  orders: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: string;
  dueDate: string;
}

interface SettlementApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: Settlement | null;
  onApprove?: (settlement: Settlement) => void;
  onDownloadPdf?: (settlement: Settlement) => void;
}

export function SettlementApprovalDialog({ open, onOpenChange, settlement, onApprove, onDownloadPdf }: SettlementApprovalDialogProps) {
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [notes, setNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleApprove = () => {
    if (!settlement || !confirmChecked) return;
    
    onApprove?.(settlement);
    toast({
      title: "Settlement goedgekeurd ✓",
      description: `${settlement.id} is goedgekeurd voor betaling aan ${settlement.carrier}.`
    });
    
    setConfirmChecked(false);
    setNotes("");
    onOpenChange(false);
  };

  const handleDownload = async () => {
    if (!settlement) return;
    
    setIsDownloading(true);
    
    // Generate and download PDF
    const pdfContent = `Settlement Statement ${settlement.id}\n\nCarrier: ${settlement.carrier}\nPeriod: ${settlement.period}\nOrders: ${settlement.orders}\nGross: €${settlement.grossAmount.toFixed(2)}\nDeductions: -€${settlement.deductions.toFixed(2)}\nNet: €${settlement.netAmount.toFixed(2)}`;
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settlement.id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    onDownloadPdf?.(settlement);
    toast({ title: "PDF gedownload ✓", description: `Statement ${settlement.id} is gedownload.` });
    setIsDownloading(false);
  };

  if (!settlement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            Settlement {settlement.id}
          </DialogTitle>
          <DialogDescription>
            {settlement.carrier} • Periode {settlement.period}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-muted-foreground">Orders</span>
              <span className="font-medium">{settlement.orders}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-muted-foreground">Bruto bedrag</span>
              <span className="font-medium">€{settlement.grossAmount.toFixed(2)}</span>
            </div>
            {settlement.deductions > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20">
                <span className="text-rose-600">Aftrek</span>
                <span className="font-medium text-rose-600">-€{settlement.deductions.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between p-3 border-2 rounded-lg border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <span className="font-medium text-emerald-600">Netto te betalen</span>
              <span className="font-bold text-lg text-emerald-600">€{settlement.netAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Vervaldatum: {settlement.dueDate}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Interne notitie (optioneel)</Label>
            <Textarea 
              placeholder="Voeg een notitie toe..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Confirmation */}
          {settlement.status === "pending" && (
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
              <Checkbox 
                id="confirm" 
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked === true)}
              />
              <Label htmlFor="confirm" className="text-sm">
                Ik bevestig dat de bedragen correct zijn en goedkeuring voor betaling
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
          {settlement.status === "pending" && (
            <Button onClick={handleApprove} disabled={!confirmChecked || isApproving}>
              {isApproving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Goedkeuren
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
