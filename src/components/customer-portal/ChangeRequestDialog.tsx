import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Clock, User, FileText, MapPin, XCircle } from "lucide-react";
import { ChangeRequestType } from "@/hooks/useChangeRequests";

interface ChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  onSubmit: (type: ChangeRequestType, details: string) => Promise<void>;
}

const requestTypes: { value: ChangeRequestType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: "timewindow", 
    label: "Tijdvenster wijzigen", 
    icon: <Clock className="h-5 w-5" />,
    description: "Nieuw ophaal- of aflevermoment aanvragen"
  },
  { 
    value: "contact", 
    label: "Contact wijzigen", 
    icon: <User className="h-5 w-5" />,
    description: "Contactpersoon of telefoonnummer aanpassen"
  },
  { 
    value: "instructions", 
    label: "Instructies toevoegen", 
    icon: <FileText className="h-5 w-5" />,
    description: "Extra aflevering of ophaalinstructies"
  },
  { 
    value: "address_fix", 
    label: "Adres corrigeren", 
    icon: <MapPin className="h-5 w-5" />,
    description: "Fout in adresgegevens melden"
  },
  { 
    value: "cancel_request", 
    label: "Annulering aanvragen", 
    icon: <XCircle className="h-5 w-5" />,
    description: "Zending annuleren (onder voorbehoud)"
  },
];

export const ChangeRequestDialog = ({
  open,
  onOpenChange,
  shipmentId,
  onSubmit,
}: ChangeRequestDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<ChangeRequestType | "">("");
  const [details, setDetails] = useState("");

  const handleSubmit = async () => {
    if (!selectedType || !details.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(selectedType, details);
      onOpenChange(false);
      setSelectedType("");
      setDetails("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wijziging aanvragen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type wijziging</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(val) => setSelectedType(val as ChangeRequestType)}
              className="space-y-2"
            >
              {requestTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedType === type.value 
                      ? "border-primary bg-primary/5 ring-1 ring-primary" 
                      : "hover:bg-accent/5"
                  }`}
                >
                  <RadioGroupItem value={type.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">{type.icon}</span>
                      <span className="font-medium">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Toelichting *</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Beschrijf je wijzigingsverzoek..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Geef zoveel mogelijk details voor snelle afhandeling
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedType || !details.trim()}
            className="btn-premium"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Verzoek indienen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
