import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Send, Loader2, FileText, Clock, MessageSquare } from "lucide-react";

interface Dispute {
  id: string;
  carrier: string;
  order: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  description: string;
}

interface DisputeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispute: Dispute | null;
  onRespond?: (dispute: Dispute, message: string) => void;
  onResolve?: (dispute: Dispute) => void;
}

export function DisputeDetailDialog({ open, onOpenChange, dispute, onRespond, onResolve }: DisputeDetailDialogProps) {
  const [responseMessage, setResponseMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const handleSendResponse = async () => {
    if (!dispute || !responseMessage.trim()) return;
    
    setIsSending(true);
    try {
      onRespond?.(dispute, responseMessage);
      toast({
        title: "Reactie verzonden ✓",
        description: `Carrier ${dispute.carrier} ontvangt een notificatie.`
      });
      setResponseMessage("");
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  if (!dispute) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            Dispute {dispute.id}
          </DialogTitle>
          <DialogDescription>
            {dispute.carrier} • Order {dispute.order}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">Geschiedenis</TabsTrigger>
            <TabsTrigger value="respond">Reageren</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium mt-1">{dispute.type}</p>
              </div>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Bedrag</p>
                <p className="font-medium mt-1 text-rose-600">€{dispute.amount.toFixed(2)}</p>
              </div>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="mt-1" variant={
                  dispute.status === "open" ? "destructive" : 
                  dispute.status === "in_behandeling" ? "default" : 
                  "secondary"
                }>
                  {dispute.status === "open" ? "Open" : 
                   dispute.status === "in_behandeling" ? "In behandeling" : 
                   "Opgelost"}
                </Badge>
              </div>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Aangemaakt</p>
                <p className="font-medium mt-1">{dispute.createdAt}</p>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Beschrijving</p>
              <p className="mt-1">{dispute.description}</p>
            </div>
          </TabsContent>

          <TabsContent value="history" className="py-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dispute aangemaakt</p>
                  <p className="text-xs text-muted-foreground">{dispute.createdAt} door Systeem</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <MessageSquare className="h-4 w-4 mt-0.5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Carrier genotificeerd</p>
                  <p className="text-xs text-muted-foreground">{dispute.createdAt} via Email</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="respond" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bericht aan carrier</Label>
              <Textarea 
                placeholder="Typ uw reactie naar de carrier..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={handleSendResponse}
                disabled={!responseMessage.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Verstuur Reactie
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Sluiten
          </Button>
          {dispute.status !== "opgelost" && (
            <Button 
              variant="default"
              onClick={() => {
                onResolve?.(dispute);
                toast({ title: "Dispute opgelost ✓", description: `Dispute ${dispute.id} is gemarkeerd als opgelost.` });
                onOpenChange(false);
              }}
            >
              Markeer als Opgelost
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
