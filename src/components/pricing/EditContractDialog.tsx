import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { RateContract } from "@/hooks/useRateContractEngine";

const contractSchema = z.object({
  name: z.string().min(3, "Naam moet minimaal 3 karakters zijn"),
  contract_type: z.enum(["customer", "carrier"]),
  counterparty_id: z.string().optional(),
  effective_from: z.string().min(1, "Startdatum is verplicht"),
  effective_to: z.string().nullable().optional(),
  currency: z.string().default("EUR"),
  status: z.enum(["draft", "active", "expired", "archived"]),
});

type ContractFormData = z.infer<typeof contractSchema>;

interface EditContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: RateContract | null;
  onSave: (data: Partial<RateContract> & { id: string }) => Promise<void>;
  isLoading?: boolean;
}

export const EditContractDialog: React.FC<EditContractDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onSave,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      name: "",
      contract_type: "customer",
      counterparty_id: "",
      effective_from: "",
      effective_to: "",
      currency: "EUR",
      status: "draft",
    },
  });

  useEffect(() => {
    if (contract && open) {
      reset({
        name: contract.name,
        contract_type: contract.contract_type,
        counterparty_id: contract.counterparty_id || "",
        effective_from: contract.effective_from?.split("T")[0] || "",
        effective_to: contract.effective_to?.split("T")[0] || "",
        currency: contract.currency || "EUR",
        status: contract.status,
      });
    }
  }, [contract, open, reset]);

  const onSubmit = async (data: ContractFormData) => {
    if (!contract) return;
    await onSave({
      id: contract.id,
      name: data.name,
      contract_type: data.contract_type,
      counterparty_id: data.counterparty_id || contract.counterparty_id,
      effective_from: data.effective_from,
      effective_to: data.effective_to || null,
      currency: data.currency,
      status: data.status,
    });
  };

  const contractType = watch("contract_type");
  const status = watch("status");
  const currency = watch("currency");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contract Bewerken</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam</Label>
            <Input
              id="name"
              placeholder="Contract naam"
              {...register("name")}
              error={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={contractType}
                onValueChange={(v) => setValue("contract_type", v as "customer" | "carrier")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Klant</SelectItem>
                  <SelectItem value="carrier">Charter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valuta</Label>
              <Select
                value={currency}
                onValueChange={(v) => setValue("currency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effective_from">Geldig vanaf</Label>
              <Input
                id="effective_from"
                type="date"
                {...register("effective_from")}
                error={!!errors.effective_from}
              />
              {errors.effective_from && (
                <p className="text-sm text-destructive">{errors.effective_from.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_to">Geldig tot</Label>
              <Input
                id="effective_to"
                type="date"
                {...register("effective_to")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setValue("status", v as "draft" | "active" | "expired" | "archived")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Concept</SelectItem>
                <SelectItem value="active">Actief</SelectItem>
                <SelectItem value="expired">Verlopen</SelectItem>
                <SelectItem value="archived">Gearchiveerd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
