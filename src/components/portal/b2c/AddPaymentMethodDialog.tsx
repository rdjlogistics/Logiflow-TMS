import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { 
  CreditCard, 
  Building2, 
  Loader2, 
  CheckCircle2,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (method: PaymentMethod) => void;
}

export interface PaymentMethod {
  id: string;
  type: "ideal" | "card" | "sepa";
  name: string;
  last4: string;
  isDefault: boolean;
}

type Step = "select" | "details" | "success";

const paymentTypes = [
  { 
    id: "ideal", 
    label: "iDEAL", 
    icon: "🏦", 
    description: "Betaal direct via je bank",
    popular: true 
  },
  { 
    id: "card", 
    label: "Creditcard", 
    icon: "💳", 
    description: "Visa, Mastercard, AMEX" 
  },
  { 
    id: "sepa", 
    label: "SEPA Incasso", 
    icon: "🏛️", 
    description: "Automatische incasso" 
  },
];

const banks = [
  { id: "ing", name: "ING" },
  { id: "rabobank", name: "Rabobank" },
  { id: "abn", name: "ABN AMRO" },
  { id: "sns", name: "SNS Bank" },
  { id: "asn", name: "ASN Bank" },
  { id: "bunq", name: "bunq" },
  { id: "triodos", name: "Triodos Bank" },
  { id: "knab", name: "Knab" },
];

export const AddPaymentMethodDialog = ({ 
  open, 
  onOpenChange, 
  onAdd 
}: AddPaymentMethodDialogProps) => {
  const [step, setStep] = useState<Step>("select");
  const [selectedType, setSelectedType] = useState<string>("ideal");
  const [saving, setSaving] = useState(false);
  
  // iDEAL state
  const [selectedBank, setSelectedBank] = useState("");
  
  // Card state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  
  // SEPA state
  const [iban, setIban] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  const resetForm = () => {
    setStep("select");
    setSelectedType("ideal");
    setSelectedBank("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setCardName("");
    setIban("");
    setAccountHolder("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts: string[] = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const formatIban = (value: string) => {
    const v = value.replace(/\s+/g, "").toUpperCase();
    const parts: string[] = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(" ");
  };

  const canProceed = () => {
    if (step === "select") return true;
    
    if (step === "details") {
      switch (selectedType) {
        case "ideal":
          return selectedBank !== "";
        case "card":
          return cardNumber.length >= 19 && cardExpiry.length === 5 && cardCvc.length >= 3 && cardName.length > 0;
        case "sepa":
          return iban.length >= 18 && accountHolder.length > 0;
        default:
          return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    
    let newMethod: PaymentMethod;
    
    switch (selectedType) {
      case "ideal":
        const bank = banks.find(b => b.id === selectedBank);
        newMethod = {
          id: crypto.randomUUID(),
          type: "ideal",
          name: `iDEAL - ${bank?.name || selectedBank}`,
          last4: "****",
          isDefault: false,
        };
        break;
      case "card":
        newMethod = {
          id: crypto.randomUUID(),
          type: "card",
          name: cardNumber.startsWith("4") ? "Visa" : cardNumber.startsWith("5") ? "Mastercard" : "Card",
          last4: cardNumber.slice(-4).replace(/\s/g, ""),
          isDefault: false,
        };
        break;
      case "sepa":
        newMethod = {
          id: crypto.randomUUID(),
          type: "sepa",
          name: "SEPA Incasso",
          last4: iban.slice(-4).replace(/\s/g, ""),
          isDefault: false,
        };
        break;
      default:
        setSaving(false);
        return;
    }
    
    setSaving(false);
    setStep("success");
    
    // Add after brief delay to show success animation
    setTimeout(() => {
      onAdd(newMethod);
      toast.success("Betaalmethode toegevoegd");
      handleClose();
    }, 1500);
  };

  const handleNext = () => {
    if (step === "select") {
      setStep("details");
    } else if (step === "details") {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "details" && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -ml-2"
                onClick={() => setStep("select")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === "select" && "Betaalmethode toevoegen"}
            {step === "details" && (selectedType === "ideal" ? "Bank selecteren" : 
              selectedType === "card" ? "Kaartgegevens" : "IBAN gegevens")}
            {step === "success" && "Gelukt!"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Kies hoe je wilt betalen"}
            {step === "details" && "Vul je gegevens in"}
            {step === "success" && "Je betaalmethode is toegevoegd"}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3 py-4"
            >
              <RadioGroup value={selectedType} onValueChange={setSelectedType}>
                {paymentTypes.map((type) => (
                  <div key={type.id}>
                    <RadioGroupItem
                      value={type.id}
                      id={type.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all touch-manipulation active:scale-[0.98]",
                        selectedType === type.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div className="text-2xl">{type.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{type.label}</span>
                          {type.popular && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                              Populair
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </motion.div>
          )}

          {step === "details" && selectedType === "ideal" && (
            <motion.div
              key="ideal"
              initial={{ opacity: 0, x: 20 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3 py-4"
            >
              <RadioGroup value={selectedBank} onValueChange={setSelectedBank}>
                <div className="grid grid-cols-2 gap-2">
                  {banks.map((bank) => (
                    <div key={bank.id}>
                      <RadioGroupItem
                        value={bank.id}
                        id={bank.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={bank.id}
                        className={cn(
                          "flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium touch-manipulation active:scale-[0.97]",
                          selectedBank === bank.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/50"
                        )}
                      >
                        {bank.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </motion.div>
          )}

          {step === "details" && selectedType === "card" && (
            <motion.div
              key="card"
              initial={{ opacity: 0, x: 20 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label>Kaartnummer</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Vervaldatum</Label>
                  <Input
                    placeholder="MM/JJ"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CVC</Label>
                  <Input
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                    maxLength={4}
                    type="password"
                    className="h-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Naam op kaart</Label>
                <Input
                  placeholder="J. Jansen"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>Je gegevens worden veilig versleuteld opgeslagen</span>
              </div>
            </motion.div>
          )}

          {step === "details" && selectedType === "sepa" && (
            <motion.div
              key="sepa"
              initial={{ opacity: 0, x: 20 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label>IBAN</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="NL00 BANK 0123 4567 89"
                    value={iban}
                    onChange={(e) => setIban(formatIban(e.target.value))}
                    maxLength={27}
                    className="pl-10 h-12 uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rekeninghouder</Label>
                <Input
                  placeholder="J. Jansen"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400">
                <p>Door verder te gaan geef je toestemming voor automatische incasso. Je kunt dit altijd intrekken.</p>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </motion.div>
              <p className="text-lg font-medium">Betaalmethode toegevoegd</p>
              <p className="text-sm text-muted-foreground">Je kunt nu betalen met deze methode</p>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== "success" && (
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Annuleren
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={!canProceed() || saving}
              className="flex-1"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {step === "select" ? "Volgende" : "Toevoegen"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
