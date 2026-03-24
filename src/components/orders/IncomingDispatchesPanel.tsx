import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useIntercompanyDispatch } from "@/hooks/useIntercompanyDispatch";
import { useCompany } from "@/hooks/useCompany";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Check, X, Truck, MapPin, Calendar, Euro, Building2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export function IncomingDispatchesPanel() {
  const { company } = useCompany();
  const { incomingDispatches, acceptDispatch, declineDispatch, loading, refetchIncoming } = useIntercompanyDispatch();
  const [selectedDispatch, setSelectedDispatch] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const pendingDispatches = incomingDispatches.filter(d => d.status === 'pending');

  const handleAccept = async (dispatchId: string) => {
    setProcessing(true);
    try {
      await acceptDispatch(dispatchId);
      toast.success("Order geaccepteerd en aangemaakt in uw systeem");
    } catch (error) {
      toast.error("Fout bij accepteren van order");
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedDispatch) return;
    setProcessing(true);
    try {
      await declineDispatch(selectedDispatch, declineReason);
      toast.success("Order afgewezen");
      setShowDeclineDialog(false);
      setDeclineReason("");
      setSelectedDispatch(null);
    } catch (error) {
      toast.error("Fout bij afwijzen van order");
    } finally {
      setProcessing(false);
    }
  };

  const openDeclineDialog = (dispatchId: string) => {
    setSelectedDispatch(dispatchId);
    setShowDeclineDialog(true);
  };

  if (!company) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pendingDispatches.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Inkomende Orders ({pendingDispatches.length})
          </CardTitle>
          <CardDescription>
            Orders van uw netwerkpartners die wachten op acceptatie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingDispatches.map((dispatch) => (
            <Card key={dispatch.id} className="bg-background">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {dispatch.from_company?.name || 'Onbekend bedrijf'}
                      </span>
                      <Badge variant="outline">
                        {dispatch.dispatch_type === 'subcontract' ? 'Onderaanneming' : 'Charter'}
                      </Badge>
                    </div>

                    {dispatch.primary_order && (
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Ophalen</p>
                            <p className="text-muted-foreground">
                              {dispatch.primary_order.pickup_address}
                              {dispatch.primary_order.pickup_city && `, ${dispatch.primary_order.pickup_city}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Afleveren</p>
                            <p className="text-muted-foreground">
                              {dispatch.primary_order.delivery_address}
                              {dispatch.primary_order.delivery_city && `, ${dispatch.primary_order.delivery_city}`}
                            </p>
                          </div>
                        </div>
                        {dispatch.primary_order.estimated_arrival && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {format(new Date(dispatch.primary_order.estimated_arrival), 'EEEE d MMMM yyyy', { locale: nl })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {dispatch.dispatch_notes && (
                      <p className="text-sm text-muted-foreground italic">
                        "{dispatch.dispatch_notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {dispatch.agreed_price && (
                      <div className="flex items-center gap-1 text-lg font-semibold">
                        <Euro className="h-5 w-5" />
                        {dispatch.agreed_price.toFixed(2)}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeclineDialog(dispatch.id)}
                        disabled={processing}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Afwijzen
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(dispatch.id)}
                        disabled={processing}
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Accepteren
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order afwijzen</DialogTitle>
            <DialogDescription>
              Geef optioneel een reden op voor het afwijzen van deze order.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reden voor afwijzing (optioneel)..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Afwijzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
