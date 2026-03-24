import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Accessorial } from "@/hooks/useRateContractEngine";

const accessorialSchema = z.object({
  code: z.string().min(2, "Code moet minimaal 2 karakters zijn").max(10, "Code mag maximaal 10 karakters zijn"),
  name: z.string().min(3, "Naam moet minimaal 3 karakters zijn"),
  applies_to: z.enum(["customer", "carrier", "both"]),
  calc_type: z.enum(["fixed", "per_km", "per_stop", "per_min", "percent"]),
  amount: z.number().min(0, "Bedrag moet positief zijn"),
  tax_code: z.string().optional(),
  requires_proof: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type AccessorialFormData = z.infer<typeof accessorialSchema>;

interface EditAccessorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessorial: Accessorial | null;
  onSave: (data: Partial<Accessorial> & { id: string }) => Promise<void>;
  isLoading?: boolean;
}

export const EditAccessorialDialog: React.FC<EditAccessorialDialogProps> = ({
  open,
  onOpenChange,
  accessorial,
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
  } = useForm<AccessorialFormData>({
    resolver: zodResolver(accessorialSchema),
    defaultValues: {
      code: "",
      name: "",
      applies_to: "both",
      calc_type: "fixed",
      amount: 0,
      tax_code: "",
      requires_proof: false,
      is_active: true,
    },
  });

  useEffect(() => {
    if (accessorial && open) {
      reset({
        code: accessorial.code,
        name: accessorial.name,
        applies_to: accessorial.applies_to,
        calc_type: accessorial.calc_type,
        amount: accessorial.amount,
        tax_code: accessorial.tax_code || "",
        requires_proof: accessorial.requires_proof,
        is_active: accessorial.is_active,
      });
    }
  }, [accessorial, open, reset]);

  const onSubmit = async (data: AccessorialFormData) => {
    if (!accessorial) return;
    await onSave({
      id: accessorial.id,
      code: data.code.toUpperCase(),
      name: data.name,
      applies_to: data.applies_to,
      calc_type: data.calc_type,
      amount: data.amount,
      tax_code: data.tax_code || null,
      requires_proof: data.requires_proof,
      is_active: data.is_active,
    });
  };

  const appliesTo = watch("applies_to");
  const calcType = watch("calc_type");
  const requiresProof = watch("requires_proof");
  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Toeslag Bewerken</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="LIFT"
                {...register("code")}
                onChange={(e) => setValue("code", e.target.value.toUpperCase())}
                error={!!errors.code}
                maxLength={10}
                className="uppercase"
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <Input
                id="name"
                placeholder="Laadklep gebruik"
                {...register("name")}
                error={!!errors.name}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Toepassing</Label>
            <Select
              value={appliesTo}
              onValueChange={(v) => setValue("applies_to", v as AccessorialFormData["applies_to"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Alleen Klant</SelectItem>
                <SelectItem value="carrier">Alleen Charter</SelectItem>
                <SelectItem value="both">Beide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Berekening</Label>
              <Select
                value={calcType}
                onValueChange={(v) => setValue("calc_type", v as AccessorialFormData["calc_type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Vast bedrag</SelectItem>
                  <SelectItem value="per_km">Per kilometer</SelectItem>
                  <SelectItem value="per_stop">Per stop</SelectItem>
                  <SelectItem value="per_min">Per minuut</SelectItem>
                  <SelectItem value="percent">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">
                Bedrag {calcType === "percent" ? "(%)" : "(€)"}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="25.00"
                {...register("amount", { valueAsNumber: true })}
                error={!!errors.amount}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_code">Belastingcode (optioneel)</Label>
            <Input
              id="tax_code"
              placeholder="BTW21"
              {...register("tax_code")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="requires_proof">Bewijs vereist</Label>
            <Switch
              id="requires_proof"
              checked={requiresProof}
              onCheckedChange={(checked) => setValue("requires_proof", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Toeslag Actief</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue("is_active", checked)}
            />
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
