import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle, FileText, Info } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { berekenBTW, type BtwResultaat, type BtwType } from "@/lib/btw-calculator";

interface ManualInvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  vat_percentage: number;
}

interface ManualInvoiceFormProps {
  onSuccess?: (invoiceId: string) => void;
  onCancel?: () => void;
}

export function ManualInvoiceForm({ onSuccess, onCancel }: ManualInvoiceFormProps) {
  const queryClient = useQueryClient();
  const { company } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [btwResultaat, setBtwResultaat] = useState<BtwResultaat | null>(null);
  const [formData, setFormData] = useState({
    customer_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
  });
  const [lines, setLines] = useState<ManualInvoiceLine[]>([
    { description: "", quantity: 1, unit_price: 0, vat_percentage: 21 },
  ]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-invoice'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, company_name, country, vat_number')
        .eq('is_active', true)
        .order('company_name');
      return data || [];
    },
  });

  // Auto-calculate BTW when customer changes
  const handleCustomerChange = useCallback((customerId: string) => {
    setFormData(prev => ({ ...prev, customer_id: customerId }));
    
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      const result = berekenBTW({
        afzenderLand: company?.country || 'NL',
        ontvangerLand: customer.country,
        ontvangerBTWnummer: customer.vat_number,
      });
      setBtwResultaat(result);
      
      // Update all lines with the calculated BTW
      setLines(prev => prev.map(line => ({
        ...line,
        vat_percentage: result.tarief,
      })));
    }
  }, [customers, company]);

  const addLine = () => {
    setLines([...lines, { description: "", quantity: 1, unit_price: 0, vat_percentage: btwResultaat?.tarief ?? 21 }]);
  };

  const updateLine = (index: number, field: keyof ManualInvoiceLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
    const vatAmount = lines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unit_price;
      return sum + (lineTotal * (line.vat_percentage / 100));
    }, 0);
    return { subtotal, vatAmount, total: subtotal + vatAmount };
  };

  const handleSubmit = async () => {
    if (!formData.customer_id) {
      toast.error("Selecteer een klant");
      return;
    }

    if (lines.some(l => !l.description || l.unit_price <= 0)) {
      toast.error("Vul alle regelgegevens in");
      return;
    }

    const { total } = calculateTotals();
    if (total <= 0) {
      toast.error("Totaalbedrag moet groter zijn dan €0");
      return;
    }

    // Warn if invoice date is more than 7 days in the past
    const invoiceDate = new Date(formData.invoice_date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (invoiceDate < sevenDaysAgo) {
      const proceed = window.confirm(
        `De factuurdatum (${formData.invoice_date}) ligt meer dan 7 dagen in het verleden. Weet je zeker dat dit klopt?`
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      const { subtotal, vatAmount, total } = calculateTotals();

      // Atomisch factuurnummer — geen fallback, faal hard bij RPC failure
      const { data: numberData, error: numberError } = await supabase.rpc("get_next_invoice_number", { p_company_id: company?.id ?? '' });

      if (numberError || !numberData) {
        console.error('Invoice number generation failed:', numberError);
        toast.error("Factuurnummer genereren mislukt", {
          description: "Probeer het opnieuw of neem contact op met support",
        });
        setIsSubmitting(false);
        return;
      }

      const invoiceNumber = numberData;

      // Calculate BTW info
      const customer = customers.find(c => c.id === formData.customer_id);
      const btw = berekenBTW({
        afzenderLand: company?.country || 'NL',
        ontvangerLand: customer?.country,
        ontvangerBTWnummer: customer?.vat_number,
      });

      // Create invoice with is_manual = true
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_id: formData.customer_id,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          subtotal,
          vat_percentage: btw.tarief,
          vat_amount: vatAmount,
          total_amount: total,
          notes: formData.notes,
          status: "concept",
          is_manual: true,
          invoice_type: "handmatig",
          company_id: company?.id ?? null,
          vat_type: btw.type,
          vat_note: btw.factuurVermelding || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice lines with line_type = 'manual'
      const linesToInsert = lines.map((line) => ({
        invoice_id: invoice.id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_price: line.quantity * line.unit_price,
        vat_percentage: line.vat_percentage,
        vat_amount: (line.quantity * line.unit_price) * (line.vat_percentage / 100),
        line_type: "manual",
        vat_type: btw.type,
      }));

      const { error: linesError } = await supabase
        .from("invoice_lines")
        .insert(linesToInsert);

      if (linesError) throw linesError;

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factuur succesvol aangemaakt");
      onSuccess?.(invoice.id);
    } catch (error: any) {
      console.error("Error creating manual invoice:", error);
      toast.error("Fout bij aanmaken factuur", { description: error?.message || "Onbekende fout" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, vatAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/50">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600 dark:text-amber-400">
          Handmatige Factuur
        </AlertTitle>
        <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
          Dit is een handmatige factuur die niet gekoppeld is aan orders. 
          Gebruik dit alleen voor uitzonderlijke situaties zoals correcties of losse diensten.
        </AlertDescription>
      </Alert>

      {/* Customer & Dates */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Factuurgegevens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Klant *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer klant" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Factuurdatum</Label>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                min={(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })()}
              />
            </div>
            <div className="space-y-2">
              <Label>Vervaldatum</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                min={formData.invoice_date || undefined}
              />
            </div>
          </div>

          {/* BTW Indicator */}
          {btwResultaat && formData.customer_id && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              btwResultaat.type === 'verlegd' 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                : btwResultaat.type === 'vrijgesteld'
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-muted/50 border-border/50 text-muted-foreground'
            }`}>
              <Info className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                BTW {btwResultaat.tarief}% — {btwResultaat.type === 'normaal' ? 'Standaard tarief' : btwResultaat.factuurVermelding}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Lines */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Factuurregels</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-2 h-4 w-4" />
              Regel toevoegen
            </Button>
          </div>
          <CardDescription>
            Voeg handmatig factuurregels toe met beschrijving, aantal en prijs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-3 p-4 bg-muted/30 rounded-xl border border-border/50"
            >
              <div className="col-span-12 md:col-span-4">
                <Label className="text-xs text-muted-foreground">Omschrijving</Label>
                <Input
                  placeholder="Beschrijving..."
                  value={line.description}
                  onChange={(e) => updateLine(index, "description", e.target.value)}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs text-muted-foreground">Aantal</Label>
                <Input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(index, "quantity", Number(e.target.value))}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs text-muted-foreground">Prijs</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={line.unit_price}
                  onChange={(e) => updateLine(index, "unit_price", Number(e.target.value))}
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <Label className="text-xs text-muted-foreground">BTW %</Label>
                <Select
                  value={line.vat_percentage.toString()}
                  onValueChange={(value) => updateLine(index, "vat_percentage", Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="9">9%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex items-end justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="w-full md:w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotaal</span>
                <span className="font-medium">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">BTW</span>
                <span className="font-medium">€{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Totaal</span>
                <span className="text-primary">€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Opmerkingen</Label>
        <Textarea
          placeholder="Optionele opmerkingen op de factuur..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuleren
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="btn-premium"
        >
          {isSubmitting ? "Aanmaken..." : "Factuur aanmaken"}
        </Button>
      </div>
    </div>
  );
}
