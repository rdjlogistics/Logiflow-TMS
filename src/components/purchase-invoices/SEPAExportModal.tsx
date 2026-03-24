import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Landmark,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Euro,
  Building2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  validateIBAN,
  validateBIC,
  deriveBICFromIBAN,
  generateMessageId,
  generateSEPAXml,
  downloadSEPAFile,
  formatSEPADate,
  formatSEPADateTime,
  type SEPAConfig,
  type SEPAPayment,
} from "@/lib/sepa-export";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  carrier_id: string;
  carriers: {
    id: string;
    company_name: string;
    iban?: string | null;
    bic?: string | null;
  };
}

interface SEPAExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: PurchaseInvoice[];
  onExportComplete: () => void;
}

interface ValidationIssue {
  invoiceNumber: string;
  carrierName: string;
  carrierId: string;
  issue: string;
  type: "error" | "warning";
}

export const SEPAExportModal = ({
  open,
  onOpenChange,
  invoices,
  onExportComplete,
}: SEPAExportModalProps) => {
  const [executionDate, setExecutionDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [isExporting, setIsExporting] = useState(false);

  // Fetch company details for debtor info
  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ["company-for-sepa"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userCompany } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", userData.user.id)
        .eq("is_primary", true)
        .single();

      if (!userCompany) throw new Error("No company found");

      const { data: companyData, error } = await supabase
        .from("companies")
        .select("id, name, iban, bic")
        .eq("id", userCompany.company_id)
        .single();

      if (error) throw error;
      return companyData;
    },
    enabled: open,
  });

  // Filter for unpaid invoices only
  const unpaidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status !== "betaald"),
    [invoices]
  );

  // Validate all invoices
  const validationResults = useMemo(() => {
    const issues: ValidationIssue[] = [];
    const validPayments: SEPAPayment[] = [];

    // Check company IBAN/BIC
    if (!company?.iban || !validateIBAN(company.iban)) {
      issues.push({
        invoiceNumber: "-",
        carrierName: company?.name || "Uw bedrijf",
        carrierId: "",
        issue: "Bedrijfs-IBAN ontbreekt of is ongeldig",
        type: "error",
      });
    }

    const companyBic = company?.bic || deriveBICFromIBAN(company?.iban || "");
    if (!companyBic) {
      issues.push({
        invoiceNumber: "-",
        carrierName: company?.name || "Uw bedrijf",
        carrierId: "",
        issue: "Bedrijfs-BIC ontbreekt en kan niet worden afgeleid",
        type: "error",
      });
    }

    // Check each invoice's carrier
    unpaidInvoices.forEach((inv) => {
      const carrier = inv.carriers;

      if (!carrier.iban) {
        issues.push({
          invoiceNumber: inv.invoice_number,
          carrierName: carrier.company_name,
          carrierId: carrier.id,
          issue: "IBAN ontbreekt",
          type: "error",
        });
        return;
      }

      if (!validateIBAN(carrier.iban)) {
        issues.push({
          invoiceNumber: inv.invoice_number,
          carrierName: carrier.company_name,
          carrierId: carrier.id,
          issue: "Ongeldig IBAN",
          type: "error",
        });
        return;
      }

      const carrierBic = carrier.bic || deriveBICFromIBAN(carrier.iban);
      if (!carrierBic) {
        issues.push({
          invoiceNumber: inv.invoice_number,
          carrierName: carrier.company_name,
          carrierId: carrier.id,
          issue: "BIC ontbreekt (niet-NL IBAN)",
          type: "warning",
        });
      }

      // Valid payment
      validPayments.push({
        invoiceNumber: inv.invoice_number,
        creditorName: carrier.company_name,
        creditorIban: carrier.iban,
        creditorBic: carrierBic || undefined,
        amount: Number(inv.total_amount),
        remittanceInfo: `Factuur ${inv.invoice_number}`,
      });
    });

    const hasErrors = issues.some((i) => i.type === "error");

    return { issues, validPayments, hasErrors };
  }, [unpaidInvoices, company]);

  const totalAmount = validationResults.validPayments.reduce(
    (sum, p) => sum + p.amount,
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleExport = async () => {
    if (
      validationResults.hasErrors ||
      validationResults.validPayments.length === 0
    ) {
      toast({
        title: "Export niet mogelijk",
        description: "Los eerst alle validatiefouten op",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const config: SEPAConfig = {
        messageId: generateMessageId(),
        creationDateTime: formatSEPADateTime(new Date()),
        requestedExecutionDate: executionDate,
        debtorName: company?.name || "",
        debtorIban: company?.iban || "",
        debtorBic: company?.bic || deriveBICFromIBAN(company?.iban || "") || "",
        payments: validationResults.validPayments,
      };

      const xml = generateSEPAXml(config);
      const filename = `SEPA_${executionDate}_${validationResults.validPayments.length}_betalingen.xml`;

      downloadSEPAFile(xml, filename);

      toast({
        title: "SEPA bestand gedownload",
        description: `${validationResults.validPayments.length} betalingen (${formatCurrency(totalAmount)})`,
      });

      onExportComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("SEPA export error:", error);
      toast({
        title: "Export mislukt",
        description: "Er is een fout opgetreden bij het genereren van het SEPA bestand",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            SEPA Bankexport
          </DialogTitle>
          <DialogDescription>
            Genereer een SEPA XML bestand (pain.001.001.03) voor batch betalingen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Company Info */}
          {isLoadingCompany ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Bedrijfsgegevens laden...
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{company?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">IBAN: </span>
                  <span
                    className={cn(
                      "font-mono",
                      company?.iban && validateIBAN(company.iban)
                        ? "text-emerald-600"
                        : "text-red-500"
                    )}
                  >
                    {company?.iban || "Niet ingesteld"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">BIC: </span>
                  <span className="font-mono">
                    {company?.bic ||
                      deriveBICFromIBAN(company?.iban || "") ||
                      "Automatisch"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Execution Date */}
          <div className="space-y-2">
            <Label htmlFor="execution-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Uitvoerdatum
            </Label>
            <Input
              id="execution-date"
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-48"
            />
          </div>

          {/* Validation Issues */}
          {validationResults.issues.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Validatieproblemen ({validationResults.issues.length})
              </Label>
              <ScrollArea className="h-32 rounded-lg border">
                <div className="p-2 space-y-1">
                  {validationResults.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between p-2 rounded text-sm",
                        issue.type === "error"
                          ? "bg-red-500/10 text-red-700 dark:text-red-400"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      )}
                    >
                      <div>
                        <span className="font-medium">{issue.carrierName}</span>
                        {issue.invoiceNumber !== "-" && (
                          <span className="text-muted-foreground ml-2">
                            ({issue.invoiceNumber})
                          </span>
                        )}
                        <span className="ml-2">— {issue.issue}</span>
                      </div>
                      {issue.carrierId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-7 gap-1"
                        >
                          <Link
                            to={`/carriers/${issue.carrierId}/edit`}
                            target="_blank"
                          >
                            Bewerken
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Valid Payments */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Geldige betalingen ({validationResults.validPayments.length})
            </Label>
            {validationResults.validPayments.length > 0 ? (
              <ScrollArea className="h-40 rounded-lg border">
                <div className="p-2 space-y-1">
                  {validationResults.validPayments.map((payment, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {payment.creditorName}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {payment.invoiceNumber}
                        </span>
                      </div>
                      <span className="font-mono font-medium">
                        {formatCurrency(payment.amount)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground">
                Geen geldige betalingen
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              <span className="font-medium">Totaal te betalen</span>
            </div>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleExport}
            disabled={
              isExporting ||
              validationResults.hasErrors ||
              validationResults.validPayments.length === 0
            }
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            SEPA XML Downloaden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
