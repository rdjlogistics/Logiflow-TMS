import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, Plus, Check, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddPaymentMethodDialog, PaymentMethod } from "./AddPaymentMethodDialog";

interface B2CPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export const B2CPaymentSheet = ({ open, onOpenChange }: B2CPaymentSheetProps) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(demoPaymentMethods);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleSetDefault = (id: string) => {
    setPaymentMethods(methods => 
      methods.map(m => ({ ...m, isDefault: m.id === id }))
    );
    toast.success("Standaard betaalmethode ingesteld");
  };

  const handleDelete = (id: string) => {
    const method = paymentMethods.find(m => m.id === id);
    if (method?.isDefault) {
      toast.error("Kan standaard betaalmethode niet verwijderen");
      return;
    }
    setPaymentMethods(methods => methods.filter(m => m.id !== id));
    toast.success("Betaalmethode verwijderd");
  };

  const handleAddMethod = (method: PaymentMethod) => {
    setPaymentMethods(prev => [...prev, method]);
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case "ideal":
        return "🏦";
      case "card":
        return "💳";
      case "sepa":
        return "🏛️";
      default:
        return "💰";
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>Betaalmethodes</SheetTitle>
            <SheetDescription>Beheer je opgeslagen betaalmethodes</SheetDescription>
          </SheetHeader>
          
          <div className="space-y-3 overflow-y-auto max-h-[calc(70vh-180px)]">
            {paymentMethods.map((method) => (
              <Card key={method.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center text-2xl">
                      {getPaymentIcon(method.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{method.name}</p>
                        {method.isDefault && (
                          <Badge variant="secondary" className="text-xs">Standaard</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {method.type === "card" ? `Eindigend op ${method.last4}` : 
                         method.type === "sepa" ? `IBAN eindigend op ${method.last4}` : "Bank koppeling"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!method.isDefault && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleSetDefault(method.id)}
                            title="Instellen als standaard"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(method.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {paymentMethods.length === 0 && (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Geen betaalmethodes opgeslagen</p>
              </div>
            )}
          </div>
          
          <div className="pt-4">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Betaalmethode toevoegen
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AddPaymentMethodDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddMethod}
      />
    </>
  );
};