import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Package, Truck, MapPin, Euro, Info } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateListing, CreateListingInput } from "@/hooks/useFreightMarketplace";
import { cn } from "@/lib/utils";

const listingSchema = z.object({
  listing_type: z.enum(["capacity", "load"]),
  origin_address: z.string().min(1, "Adres is verplicht"),
  origin_city: z.string().min(1, "Stad is verplicht"),
  origin_postal_code: z.string().optional(),
  destination_address: z.string().min(1, "Adres is verplicht"),
  destination_city: z.string().min(1, "Stad is verplicht"),
  destination_postal_code: z.string().optional(),
  pickup_date: z.date({ required_error: "Datum is verplicht" }),
  delivery_date: z.date().optional(),
  vehicle_type: z.string().optional(),
  weight_kg: z.number().optional(),
  volume_m3: z.number().optional(),
  loading_meters: z.number().optional(),
  goods_type: z.string().optional(),
  price_type: z.enum(["fixed", "negotiable", "per_km"]).optional(),
  price_amount: z.number().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type ListingFormData = z.infer<typeof listingSchema>;

interface CreateListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "capacity" | "load";
}

const vehicleTypes = [
  { value: "bakwagen", label: "Bakwagen" },
  { value: "trekker", label: "Trekker + Oplegger" },
  { value: "vrachtwagen", label: "Vrachtwagen" },
  { value: "bestelbus", label: "Bestelbus" },
  { value: "koelwagen", label: "Koelwagen" },
  { value: "dieplader", label: "Dieplader" },
  { value: "containerwagen", label: "Containerwagen" },
  { value: "kippertrailer", label: "Kippertrailer" },
  { value: "schuifzeilen", label: "Schuifzeilenoplegger" },
];

export function CreateListingDialog({ 
  open, 
  onOpenChange, 
  defaultType = "capacity" 
}: CreateListingDialogProps) {
  const [listingType, setListingType] = useState<"capacity" | "load">(defaultType);
  const createListing = useCreateListing();

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      listing_type: defaultType,
      origin_address: "",
      origin_city: "",
      destination_address: "",
      destination_city: "",
      price_type: "negotiable",
    },
  });

  const handleSubmit = async (data: ListingFormData) => {
    const input: CreateListingInput = {
      listing_type: listingType,
      origin_address: data.origin_address,
      origin_city: data.origin_city,
      origin_postal_code: data.origin_postal_code,
      destination_address: data.destination_address,
      destination_city: data.destination_city,
      destination_postal_code: data.destination_postal_code,
      pickup_date: format(data.pickup_date, "yyyy-MM-dd"),
      delivery_date: data.delivery_date 
        ? format(data.delivery_date, "yyyy-MM-dd") 
        : undefined,
      vehicle_type: data.vehicle_type,
      weight_kg: data.weight_kg,
      volume_m3: data.volume_m3,
      loading_meters: data.loading_meters,
      goods_type: data.goods_type,
      price_type: data.price_type,
      price_amount: data.price_amount,
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      contact_email: data.contact_email || undefined,
      notes: data.notes,
    };

    await createListing.mutateAsync(input);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {listingType === "capacity" ? (
              <><Truck className="h-5 w-5" /> Capaciteit Aanbieden</>
            ) : (
              <><Package className="h-5 w-5" /> Lading Plaatsen</>
            )}
          </DialogTitle>
          <DialogDescription>
            {listingType === "capacity" 
              ? "Bied je beschikbare transportcapaciteit aan op de marketplace."
              : "Plaats een lading die je vervoerd wilt hebben."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Type Toggle */}
          <Tabs 
            value={listingType} 
            onValueChange={(v) => setListingType(v as "capacity" | "load")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="capacity" className="gap-2">
                <Truck className="h-4 w-4" />
                Capaciteit
              </TabsTrigger>
              <TabsTrigger value="load" className="gap-2">
                <Package className="h-4 w-4" />
                Lading
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Route Section */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Route
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Origin */}
              <div className="space-y-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <Label className="text-green-600 font-medium">Vertrek</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Adres"
                    {...form.register("origin_address")}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Stad"
                      {...form.register("origin_city")}
                    />
                    <Input
                      placeholder="Postcode"
                      {...form.register("origin_postal_code")}
                    />
                  </div>
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                <Label className="text-red-600 font-medium">Bestemming</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Adres"
                    {...form.register("destination_address")}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Stad"
                      {...form.register("destination_city")}
                    />
                    <Input
                      placeholder="Postcode"
                      {...form.register("destination_postal_code")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Date & Vehicle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ophaaldatum *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("pickup_date") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("pickup_date") ? (
                      format(form.watch("pickup_date"), "PPP")
                    ) : (
                      <span>Selecteer datum</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("pickup_date")}
                    onSelect={(date) => form.setValue("pickup_date", date!)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Voertuigtype</Label>
              <Select
                value={form.watch("vehicle_type")}
                onValueChange={(v) => form.setValue("vehicle_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Capacity Details */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              {listingType === "capacity" ? "Beschikbare Capaciteit" : "Lading Details"}
            </h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Gewicht (kg)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  {...form.register("weight_kg", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Volume (m³)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  {...form.register("volume_m3", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Laadmeters</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  {...form.register("loading_meters", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Goederentype</Label>
                <Input
                  placeholder="bijv. Pallets"
                  {...form.register("goods_type")}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Prijs
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prijstype</Label>
                <Select
                  value={form.watch("price_type")}
                  onValueChange={(v) => form.setValue("price_type", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Vaste prijs</SelectItem>
                    <SelectItem value="negotiable">Onderhandelbaar</SelectItem>
                    <SelectItem value="per_km">Per kilometer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bedrag (€)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...form.register("price_amount", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contactgegevens</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  placeholder="Contactpersoon"
                  {...form.register("contact_name")}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefoon</Label>
                <Input
                  placeholder="+31 6..."
                  {...form.register("contact_phone")}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="email@bedrijf.nl"
                  {...form.register("contact_email")}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Opmerkingen</Label>
            <Textarea
              placeholder="Eventuele bijzonderheden of speciale eisen..."
              {...form.register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={createListing.isPending}>
              {createListing.isPending ? "Plaatsen..." : "Listing Plaatsen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
