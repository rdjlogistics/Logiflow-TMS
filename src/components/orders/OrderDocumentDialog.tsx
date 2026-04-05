import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  ClipboardList,
  List,
  FileCheck,
  Layers,
  Tag,
  LayoutGrid,
  Receipt,
  Download,
  Loader2,
  Info,
  Mail,
  Printer,
  Check,
} from "lucide-react";
import {
  type DocumentType,
  type DocumentCopy,
  type CarrierBranding,
  type DocumentLanguage,
  DOCUMENT_TYPES,
  DOCUMENT_COPIES,
  CARRIER_BRANDING_OPTIONS,
  DOCUMENT_LANGUAGES,
} from "@/types/documents";
import { cn } from "@/lib/utils";

interface OrderDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  orderDate?: string;
  customerEmail?: string;
  driverEmail?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  ClipboardList,
  List,
  FileCheck,
  Layers,
  Tag,
  LayoutGrid,
  Receipt,
};

const OrderDocumentDialog = ({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  orderDate,
  customerEmail,
  driverEmail,
}: OrderDocumentDialogProps) => {
  const [selectedType, setSelectedType] = useState<DocumentType>("vrachtbrief");
  const [selectedCopies, setSelectedCopies] = useState<DocumentCopy[]>(["sender", "receiver", "carrier"]);
  const [carrierBranding, setCarrierBranding] = useState<CarrierBranding>("own");
  const [language, setLanguage] = useState<DocumentLanguage>("nl");
  const [overlayCount, setOverlayCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const { toast } = useToast();

  const currentDocConfig = useMemo(
    () => DOCUMENT_TYPES.find((d) => d.value === selectedType),
    [selectedType]
  );

  const handleCopyToggle = useCallback((copy: DocumentCopy) => {
    setSelectedCopies((prev) =>
      prev.includes(copy) ? prev.filter((c) => c !== copy) : [...prev, copy]
    );
  }, []);

  const handleGenerate = async () => {
    if (currentDocConfig?.supportsCopies && selectedCopies.length === 0) {
      toast({
        title: "Selecteer exemplaren",
        description: "Selecteer minimaal één exemplaar om te genereren",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedUrl(null);
    setHtmlContent(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-document-pdf", {
        body: {
          orderId,
          documentType: selectedType,
          copies: currentDocConfig?.supportsCopies ? selectedCopies : undefined,
          carrierBranding: currentDocConfig?.supportsBranding ? carrierBranding : undefined,
          language,
          overlayCount: selectedType === "cmr_overlay" ? overlayCount : undefined,
        },
      });

      if (error) throw error;

      if (data?.url) {
        setGeneratedUrl(data.url);
        
        // Fetch and cache HTML content for download/print
        try {
          const response = await fetch(data.url);
          const fetchedHtml = await response.text();
          setHtmlContent(fetchedHtml);
        } catch (fetchError) {
          console.warn("Could not fetch HTML for caching:", fetchError);
        }

        // Log event with error handling - don't fail if table doesn't exist
        try {
          const userId = (await supabase.auth.getUser()).data.user?.id;
          await supabase.from("order_events").insert({
            order_id: orderId,
            event_type: "DOCUMENT_GENERATED",
            actor_user_id: userId,
            payload: {
              document_type: selectedType,
              copies: selectedCopies,
              carrier_branding: carrierBranding,
              language,
            },
          });
        } catch (logError) {
          console.warn("Could not log document event:", logError);
        }

        toast({
          title: "Document aangemaakt",
          description: `${currentDocConfig?.label} is succesvol gegenereerd`,
        });
      } else if (data?.html) {
        // Direct HTML response - store for download/print
        setHtmlContent(data.html);
        
        // Create blob URL for email sending
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setGeneratedUrl(url);

        toast({
          title: "Document aangemaakt",
          description: `${currentDocConfig?.label} is gegenereerd. Gebruik de knoppen hieronder om te downloaden of printen.`,
        });
      }
    } catch (error: any) {
      console.error("Document generation error:", error);
      toast({
        title: "Fout bij genereren",
        description: error.message || "Probeer het opnieuw",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSendEmail = async (recipient: "customer" | "driver") => {
    const email = recipient === "customer" ? customerEmail : driverEmail;
    if (!email) {
      toast({
        title: "Geen e-mailadres",
        description: `${recipient === "customer" ? "Klant" : "Eigen chauffeur"} heeft geen e-mailadres`,
        variant: "destructive",
      });
      return;
    }

    if (!generatedUrl) {
      toast({
        title: "Genereer eerst het document",
        description: "Klik op 'Document aanmaken' voordat je het verstuurt",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      const { error } = await supabase.functions.invoke("send-document-email", {
        body: {
          to: email,
          documentUrl: generatedUrl,
          documentType: selectedType,
          orderNumber,
          recipientType: recipient,
        },
      });

      if (error) throw error;

      toast({
        title: "E-mail verstuurd",
        description: `${currentDocConfig?.label} is verstuurd naar ${email}`,
      });
    } catch (error: any) {
      console.error("Email send error:", error);
      toast({
        title: "Fout bij versturen",
        description: error.message || "Probeer het opnieuw",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownload = async () => {
    if (!htmlContent && !generatedUrl) {
      toast({
        title: "Genereer eerst het document",
        description: "Klik op 'Document aanmaken' voordat je het downloadt",
        variant: "destructive",
      });
      return;
    }

    try {
      let content = htmlContent;
      
      // If we don't have cached content, fetch it
      if (!content && generatedUrl) {
        const response = await fetch(generatedUrl);
        content = await response.text();
      }
      
      if (!content) return;

      const blob = new Blob([content], { type: 'text/html' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${currentDocConfig?.label || 'Document'}_${orderNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Document gedownload",
        description: `${currentDocConfig?.label} is opgeslagen`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download mislukt",
        description: "Probeer het opnieuw",
        variant: "destructive",
      });
    }
  };

  const handlePrint = async () => {
    if (!htmlContent && !generatedUrl) {
      toast({
        title: "Genereer eerst het document",
        description: "Klik op 'Document aanmaken' voordat je het print",
        variant: "destructive",
      });
      return;
    }

    try {
      let content = htmlContent;
      
      // If we don't have cached content, fetch it
      if (!content && generatedUrl) {
        const response = await fetch(generatedUrl);
        content = await response.text();
      }
      
      if (!content) return;

      // Use hidden iframe for printing (works in sandbox environments)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(content);
        iframeDoc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 300);
      }
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Printen mislukt",
        description: "Probeer het opnieuw",
        variant: "destructive",
      });
    }
  };

  const formattedDate = orderDate
    ? new Date(orderDate).toLocaleDateString("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("nl-NL");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="sheet"
        className="max-h-[min(88dvh,calc(100dvh-1rem))] sm:max-h-[min(85dvh,calc(100dvh-3rem))] sm:max-w-xl flex flex-col"
        aria-describedby={undefined}
      >
        <DialogHeader className="space-y-3 shrink-0">
          <DialogTitle className="text-xl font-semibold">Document aanmaken</DialogTitle>
          <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <span>Order: <strong className="text-foreground">{orderNumber}</strong></span>
            <span>{formattedDate}</span>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto min-h-0 flex-1">
          {/* Document Type Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Kies documenttype
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Selecteer het type document dat je wilt genereren. Elk type heeft specifieke eigenschappen.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <RadioGroup
              value={selectedType}
              onValueChange={(v) => {
                setSelectedType(v as DocumentType);
                setGeneratedUrl(null);
              }}
              className="grid gap-2"
            >
              {DOCUMENT_TYPES.map((type) => {
                const Icon = iconMap[type.icon] || FileText;
                const isSelected = selectedType === type.value;

                return (
                  <motion.label
                    key={type.value}
                    initial={false}

                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                      isSelected && "ring-1 ring-primary"
                    )}
                  >
                    <RadioGroupItem value={type.value} className="mt-0.5 sr-only" />
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium text-sm",
                          isSelected && "text-primary"
                        )}>
                          {type.label}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground"
                          >
                            <Check className="h-3 w-3" />
                          </motion.div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {type.description}
                      </p>
                    </div>
                  </motion.label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Copies Selection - Only for vrachtbrief and CMR */}
          <AnimatePresence mode="wait">
            {currentDocConfig?.supportsCopies && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <Separator />
                <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Exemplaren
                </Label>
                <div className="grid gap-2">
                  {DOCUMENT_COPIES.map((copy) => {
                    const isChecked = selectedCopies.includes(copy.value);
                    // Only show 'second_carrier' for CMR full
                    if (copy.value === "second_carrier" && selectedType !== "cmr_full") {
                      return null;
                    }
                    return (
                      <motion.label
                        key={copy.value}

                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                          isChecked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleCopyToggle(copy.value)}
                        />
                        <span className="text-sm">{copy.label}</span>
                      </motion.label>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay Count - Only for CMR overlay */}
          <AnimatePresence mode="wait">
            {selectedType === "cmr_overlay" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <Separator />
                <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Aantal exemplaren
                </Label>
                <Select
                  value={overlayCount.toString()}
                  onValueChange={(v) => setOverlayCount(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} exempla{n === 1 ? "ar" : "ren"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Carrier Branding Selection */}
          <AnimatePresence mode="wait">
            {currentDocConfig?.supportsBranding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <Separator />
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Charter vermelden
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>Kies welke bedrijfsgegevens op het document worden vermeld.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <RadioGroup
                  value={carrierBranding}
                  onValueChange={(v) => setCarrierBranding(v as CarrierBranding)}
                  className="grid gap-2"
                >
                  {CARRIER_BRANDING_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                        carrierBranding === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem value={option.value} />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{option.label}</span>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Language Selection */}
          <div className="space-y-3">
            <Separator />
            <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Document taal
            </Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as DocumentLanguage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Success Actions */}
          <AnimatePresence>
            {generatedUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <Separator />
                <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Acties na genereren
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Printen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  {customerEmail && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail("customer")}
                      className="gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Naar klant
                    </Button>
                  )}
                  {driverEmail && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail("driver")}
                      className="gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Naar eigen chauffeur
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2 min-w-[160px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Genereren...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Document aanmaken
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDocumentDialog;
