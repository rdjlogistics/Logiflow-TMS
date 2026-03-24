import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { usePurchaseInvoicePdf } from "@/hooks/use-purchase-invoice-pdf";
import { type TripWithRate } from "./TripRateBreakdown";
import { useCompany } from "@/hooks/useCompany";
import { WizardHeader } from "./wizard/WizardHeader";
import { WizardProgress } from "./wizard/WizardProgress";
import { Step1SelectionSection } from "./wizard/Step1SelectionSection";
import { Step2PreviewSection } from "./wizard/Step2PreviewSection";
import { Step3ConfirmationSection } from "./wizard/Step3ConfirmationSection";

interface CarrierGroup {
  carrier_id: string;
  carrier_name: string;
  trips: TripWithRate[];
  subtotal: number;
  selected: boolean;
}

interface CreatedInvoice {
  id: string;
  invoice_number: string;
  carrier_name: string;
  total_amount: number;
}

const wizardSteps = [
  { label: "Selectie" },
  { label: "Controle" },
  { label: "Bevestiging" },
];

export const BatchPurchaseInvoiceWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { isGenerating, downloadMultiplePdfs } = usePurchaseInvoicePdf();
  
  // Step 1 state
  const [periodPreset, setPeriodPreset] = useState("prev_month");
  const [carrierId, setCarrierId] = useState<string>("all");
  const [invoiceType, setInvoiceType] = useState<"standaard" | "self_billing">("standaard");
  const [footnote, setFootnote] = useState("");
  
  // Step 2 state
  const [carrierGroups, setCarrierGroups] = useState<CarrierGroup[]>([]);
  
  // Step 3 state
  const [createdInvoices, setCreatedInvoices] = useState<CreatedInvoice[]>([]);

  // Calculate period dates based on preset
  const getPeriodDates = () => {
    const now = new Date();
    switch (periodPreset) {
      case "prev_week":
        const prevWeek = subWeeks(now, 1);
        return {
          from: format(startOfWeek(prevWeek, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          to: format(endOfWeek(prevWeek, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "this_week":
        return {
          from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "this_month":
        return {
          from: format(startOfMonth(now), "yyyy-MM-dd"),
          to: format(endOfMonth(now), "yyyy-MM-dd"),
        };
      case "prev_month":
      default:
        const prevMonth = subMonths(now, 1);
        return {
          from: format(startOfMonth(prevMonth), "yyyy-MM-dd"),
          to: format(endOfMonth(prevMonth), "yyyy-MM-dd"),
        };
    }
  };

  // Fetch carriers for dropdown
  const { data: carriers } = useQuery({
    queryKey: ["carriers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carriers")
        .select("id, company_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch eligible trips for preview with rate details
  const fetchEligibleTrips = useMutation({
    mutationFn: async () => {
      const { from, to } = getPeriodDates();
      
      let query = supabase
        .from("trips")
        .select(`
          id, order_number, carrier_id, pickup_city, delivery_city,
          purchase_total, trip_date, distance_km, travel_hours,
          carrier_rate_type, carrier_hourly_rate, carrier_km_rate, carrier_worked_hours,
          carriers!inner(id, company_name)
        `)
        .in("status", ["afgerond", "gecontroleerd"])
        .is("purchase_invoice_id", null)
        .not("carrier_id", "is", null)
        .not("purchase_total", "is", null)
        .gt("purchase_total", 0)
        .gte("trip_date", from)
        .lte("trip_date", to);

      if (carrierId !== "all") {
        query = query.eq("carrier_id", carrierId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    onSuccess: (trips) => {
      // Group by carrier
      const groupsMap = new Map<string, CarrierGroup>();
      
      for (const trip of trips) {
        const cid = trip.carrier_id ?? '';
        const carrierData = trip.carriers as any;

        if (!groupsMap.has(cid)) {
          groupsMap.set(cid, {
            carrier_id: cid,
            carrier_name: carrierData.company_name,
            trips: [],
            subtotal: 0,
            selected: true,
          });
        }

        const group = groupsMap.get(cid)!;
        group.trips.push({
          id: trip.id,
          order_number: trip.order_number ?? '',
          pickup_city: trip.pickup_city ?? '',
          delivery_city: trip.delivery_city ?? '',
          purchase_total: Number(trip.purchase_total),
          trip_date: trip.trip_date,
          distance_km: trip.distance_km ? Number(trip.distance_km) : null,
          travel_hours: trip.travel_hours ? Number(trip.travel_hours) : null,
          carrier_rate_type: trip.carrier_rate_type,
          carrier_hourly_rate: trip.carrier_hourly_rate ? Number(trip.carrier_hourly_rate) : null,
          carrier_km_rate: trip.carrier_km_rate ? Number(trip.carrier_km_rate) : null,
          carrier_worked_hours: trip.carrier_worked_hours ? Number(trip.carrier_worked_hours) : null,
        });
        group.subtotal += Number(trip.purchase_total);
      }

      setCarrierGroups(Array.from(groupsMap.values()));
      setStep(2);
    },
    onError: (error) => {
      console.error("Error fetching trips:", error);
      toast.error("Kon orders niet ophalen");
    },
  });

  // Create batch invoices
  const createInvoicesMutation = useMutation({
    mutationFn: async () => {
      const { from, to } = getPeriodDates();
      const selectedCarriers = carrierGroups.filter((g) => g.selected);
      
      if (selectedCarriers.length === 0) {
        throw new Error("Selecteer minimaal één charter");
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Niet ingelogd");
      }

      // Call edge function for each selected carrier
      const results: CreatedInvoice[] = [];
      
      for (const group of selectedCarriers) {
        const response = await supabase.functions.invoke("create-batch-purchase-invoices", {
          body: {
            carrier_id: group.carrier_id,
            period_from: from,
            period_to: to,
            invoice_date: format(new Date(), "yyyy-MM-dd"),
            is_self_billing: invoiceType === "self_billing",
            footnote: footnote || null,
          },
        });

        if (response.error) {
          console.error("Error creating invoice:", response.error);
          toast.error(`Fout bij ${group.carrier_name}: ${response.error.message}`);
          continue;
        }

        if (response.data?.invoices) {
          results.push(...response.data.invoices);
        } else if (Array.isArray(response.data)) {
          results.push(...response.data);
        }
      }

      if (results.length === 0) {
        throw new Error("Geen facturen aangemaakt — controleer of er orders beschikbaar zijn");
      }

      return results;
    },
    onSuccess: (invoices) => {
      setCreatedInvoices(invoices);
      setStep(3);
      toast.success(`${invoices.length} inkoopfactuur${invoices.length === 1 ? "" : "en"} aangemaakt`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Kon facturen niet aanmaken");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const toggleCarrierSelection = (carrierId: string) => {
    setCarrierGroups((groups) =>
      groups.map((g) =>
        g.carrier_id === carrierId ? { ...g, selected: !g.selected } : g
      )
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-8">
      {/* Premium Header */}
      <WizardHeader 
        title="Nieuwe Inkoopfactuur" 
        subtitle="Genereer automatisch inkoopfacturen uit afgeronde orders"
      />

      {/* Animated Progress Indicator */}
      <WizardProgress 
        currentStep={step} 
        steps={wizardSteps} 
      />

      {/* Step 1: Premium Selection */}
      {step === 1 && (
        <Step1SelectionSection
          periodPreset={periodPreset}
          onPeriodChange={setPeriodPreset}
          carrierId={carrierId}
          onCarrierChange={setCarrierId}
          carriers={carriers}
          invoiceType={invoiceType}
          onInvoiceTypeChange={setInvoiceType}
          footnote={footnote}
          onFootnoteChange={setFootnote}
          periodDates={getPeriodDates()}
          onNext={() => fetchEligibleTrips.mutate()}
          isLoading={fetchEligibleTrips.isPending}
        />
      )}

      {/* Step 2: Premium Preview */}
      {step === 2 && (
        <Step2PreviewSection
          carrierGroups={carrierGroups}
          onToggleCarrier={toggleCarrierSelection}
          onBack={() => setStep(1)}
          onNext={() => createInvoicesMutation.mutate()}
          isCreating={createInvoicesMutation.isPending}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Step 3: Premium Confirmation */}
      {step === 3 && (
        <Step3ConfirmationSection
          createdInvoices={createdInvoices}
          formatCurrency={formatCurrency}
          onGoToOverview={() => navigate("/purchase-invoices")}
          onDownloadPdfs={() => downloadMultiplePdfs(createdInvoices.map(inv => ({ id: inv.id, invoice_number: inv.invoice_number })))}
          isDownloading={isGenerating}
        />
      )}
    </div>
  );
};
