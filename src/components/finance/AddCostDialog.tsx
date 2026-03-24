import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateFinanceTransaction, FinanceTransactionType } from "@/hooks/useFinance";
import { Loader2, Fuel, Receipt, Truck, Wrench, Shield, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const costSchema = z.object({
  transaction_type: z.enum([
    "fuel", "toll", "parking", "maintenance", "insurance", 
    "lease", "subscription", "other_cost", "subcontract"
  ] as const, {
    required_error: "Selecteer een kostensoort",
  }),
  amount: z.coerce.number()
    .min(0.01, "Bedrag moet minimaal €0.01 zijn")
    .max(1000000, "Bedrag mag maximaal €1.000.000 zijn"),
  vat_amount: z.coerce.number().min(0).optional().default(0),
  transaction_date: z.string().min(1, "Datum is verplicht"),
  description: z.string().trim().min(1, "Omschrijving is verplicht").max(500, "Maximaal 500 karakters"),
  cost_center: z.string().optional(),
  vehicle_id: z.string().optional(),
});

type CostFormData = z.infer<typeof costSchema>;

const costTypes: { 
  value: FinanceTransactionType; 
  label: string; 
  icon: typeof Fuel;
  color: string;
}[] = [
  { value: "fuel", label: "Brandstof", icon: Fuel, color: "text-amber-500" },
  { value: "toll", label: "Tol", icon: Receipt, color: "text-blue-500" },
  { value: "parking", label: "Parkeren", icon: Receipt, color: "text-purple-500" },
  { value: "subcontract", label: "Charter / Subcontract", icon: Truck, color: "text-indigo-500" },
  { value: "maintenance", label: "Onderhoud", icon: Wrench, color: "text-orange-500" },
  { value: "insurance", label: "Verzekering", icon: Shield, color: "text-cyan-500" },
  { value: "lease", label: "Lease", icon: Truck, color: "text-emerald-500" },
  { value: "subscription", label: "Abonnement", icon: CreditCard, color: "text-pink-500" },
  { value: "other_cost", label: "Overig", icon: CreditCard, color: "text-muted-foreground" },
];

interface AddCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCostDialog = ({ open, onOpenChange }: AddCostDialogProps) => {
  const createTransaction = useCreateFinanceTransaction();
  
  const form = useForm<CostFormData>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      transaction_type: undefined,
      amount: undefined,
      vat_amount: 0,
      transaction_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      cost_center: "",
    },
  });

  const onSubmit = async (data: CostFormData) => {
    try {
      await createTransaction.mutateAsync({
        transaction_type: data.transaction_type,
        amount: -Math.abs(data.amount), // Costs are negative
        vat_amount: data.vat_amount || 0,
        transaction_date: data.transaction_date,
        description: data.description,
        cost_center: data.cost_center || null,
        vehicle_id: data.vehicle_id || null,
        import_method: "manual",
        status: "approved",
      });
      
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const selectedType = form.watch("transaction_type");
  const selectedTypeConfig = costTypes.find(t => t.value === selectedType);
  const amount = form.watch("amount") || 0;
  const vatAmount = form.watch("vat_amount") || 0;
  const totalAmount = amount + vatAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedTypeConfig && (
              <selectedTypeConfig.icon className={cn("h-5 w-5", selectedTypeConfig.color)} />
            )}
            Nieuwe Kosten Toevoegen
          </DialogTitle>
          <DialogDescription>
            Voer een nieuwe kostenpost in voor je cashflow administratie.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Cost Type Selection */}
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kostensoort *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer kostensoort" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <type.icon className={cn("h-4 w-4", type.color)} />
                            {type.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrag excl. BTW *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vat_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BTW bedrag</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Display */}
            {amount > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Totaal incl. BTW</span>
                <span className="text-lg font-semibold">
                  €{totalAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Date */}
            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Omschrijving *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Bijv. Shell tanken A2 Utrecht, Onderhoud grote beurt..."
                      rows={3}
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground text-right">
                    {field.value?.length || 0}/500
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cost Center */}
            <FormField
              control={form.control}
              name="cost_center"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kostenplaats (optioneel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Bijv. 001, Fleet, Administratie..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={createTransaction.isPending}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={createTransaction.isPending}>
                {createTransaction.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCostDialog;
