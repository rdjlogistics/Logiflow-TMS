import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Send, CheckCircle, Loader2, Bell, MessageSquare } from "lucide-react";

interface Exception {
  type: string;
  order: string;
  time: string;
  severity: string;
}

interface ExceptionActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exception: Exception | null;
  mode: "ping" | "resolve";
  onPing?: (exception: Exception, message: string) => void;
  onResolve?: (exception: Exception, resolution: string, notes: string) => void;
}

export function ExceptionActionDialog({ 
  open, 
  onOpenChange, 
  exception, 
  mode,
  onPing,
  onResolve 
}: ExceptionActionDialogProps) {
  const [message, setMessage] = useState("");
  const [resolution, setResolution] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePing = async () => {
    if (!exception) return;
    
    setIsSubmitting(true);
    try {
      await onPing?.(exception, message);
      toast({
        title: "Push notificatie verzonden ✓",
        description: `Chauffeur voor order ${exception.order} ontvangt nu een ping.`
      });
      setMessage("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!exception || !resolution) return;
    
    setIsSubmitting(true);
    try {
      await onResolve?.(exception, resolution, notes);
      toast({
        title: "Exception opgelost ✓",
        description: `${exception.type} voor order ${exception.order} is afgehandeld.`
      });
      setResolution("");
      setNotes("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!exception) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "ping" ? (
              <>
                <Bell className="h-5 w-5 text-blue-500" />
                Ping Chauffeur
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Exception Oplossen
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {exception.type} - Order {exception.order}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Exception Info */}
          <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="font-medium">{exception.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order</span>
              <span className="font-mono">{exception.order}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Details</span>
              <span>{exception.time}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Severity</span>
              <Badge variant={exception.severity === "critical" ? "destructive" : "default"}>
                {exception.severity}
              </Badge>
            </div>
          </div>

          {mode === "ping" ? (
            <div className="space-y-2">
              <Label>Bericht aan chauffeur (optioneel)</Label>
              <Textarea 
                placeholder="bijv. Graag status update over levering..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                De chauffeur ontvangt een push notificatie op zijn apparaat
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Resolutie</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer resolutie..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved_contact">Opgelost - contact met chauffeur</SelectItem>
                    <SelectItem value="resolved_customer">Opgelost - klant geïnformeerd</SelectItem>
                    <SelectItem value="false_positive">False positive - geen actie nodig</SelectItem>
                    <SelectItem value="escalated">Geëscaleerd naar management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notities</Label>
                <Textarea 
                  placeholder="Beschrijf hoe de exception is opgelost..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          {mode === "ping" ? (
            <Button onClick={handlePing} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Verstuur Ping
            </Button>
          ) : (
            <Button onClick={handleResolve} disabled={!resolution || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Markeer Opgelost
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
