import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, MapPin, Building2, FileText, Package, Route } from "lucide-react";
import { format } from "date-fns";
import { usePostcodeLookup, formatDutchPostcode } from "@/hooks/usePostcodeLookup";
import { calculateRouteDistance } from "@/utils/geocoding";

type TripStatus = "offerte" | "aanvraag" | "draft" | "gepland" | "geladen" | "onderweg" | "afgeleverd" | "afgerond" | "gecontroleerd" | "gefactureerd" | "geannuleerd";

interface TripFormData {
  customer_id: string;
  vehicle_id: string;
  trip_date: string;
  status: TripStatus;
  // Pickup
  pickup_postal_code: string;
  pickup_house_number: string;
  pickup_address: string;
  pickup_city: string;
  pickup_country: string;
  pickup_company_name: string;
  pickup_contact_person: string;
  pickup_phone: string;
  pickup_time_from: string;
  pickup_time_to: string;
  pickup_remarks: string;
  save_pickup_to_addressbook: boolean;
  // Delivery
  delivery_postal_code: string;
  delivery_house_number: string;
  delivery_address: string;
  delivery_city: string;
  delivery_country: string;
  delivery_company_name: string;
  delivery_contact_person: string;
  delivery_phone: string;
  delivery_time_from: string;
  delivery_time_to: string;
  delivery_remarks: string;
  save_delivery_to_addressbook: boolean;
  // Document references
  customer_reference: string;
  waybill_number: string;
  cmr_number: string;
  // Cargo
  cargo_description: string;
  weight_kg: number | null;
  distance_km: number | null;
  price: number | null;
  notes: string;
}

interface Customer {
  id: string;
  company_name: string;
}

interface Vehicle {
  id: string;
  license_plate: string;
  brand: string | null;
}

interface AddressBookEntry {
  id: string;
  label: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  street: string;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
}

interface Trip {
  id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  trip_date: string;
  pickup_address: string;
  pickup_postal_code: string | null;
  pickup_city: string | null;
  pickup_house_number?: string | null;
  pickup_country?: string | null;
  pickup_company_name?: string | null;
  pickup_contact_person?: string | null;
  pickup_phone?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  pickup_remarks?: string | null;
  delivery_address: string;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_house_number?: string | null;
  delivery_country?: string | null;
  delivery_company_name?: string | null;
  delivery_contact_person?: string | null;
  delivery_phone?: string | null;
  delivery_time_from?: string | null;
  delivery_time_to?: string | null;
  delivery_remarks?: string | null;
  cargo_description: string | null;
  weight_kg: number | null;
  distance_km: number | null;
  price: number | null;
  status: TripStatus;
  notes: string | null;
  customer_reference?: string | null;
  waybill_number?: string | null;
  cmr_number?: string | null;
  save_pickup_to_addressbook?: boolean;
  save_delivery_to_addressbook?: boolean;
}

interface AutoFilledFields {
  pickup_address: boolean;
  pickup_city: boolean;
  delivery_address: boolean;
  delivery_city: boolean;
}

const emptyFormData: TripFormData = {
  customer_id: "",
  vehicle_id: "",
  trip_date: format(new Date(), "yyyy-MM-dd"),
  status: "gepland",
  pickup_postal_code: "",
  pickup_house_number: "",
  pickup_address: "",
  pickup_city: "",
  pickup_country: "Nederland",
  pickup_company_name: "",
  pickup_contact_person: "",
  pickup_phone: "",
  pickup_time_from: "",
  pickup_time_to: "",
  pickup_remarks: "",
  save_pickup_to_addressbook: false,
  delivery_postal_code: "",
  delivery_house_number: "",
  delivery_address: "",
  delivery_city: "",
  delivery_country: "Nederland",
  delivery_company_name: "",
  delivery_contact_person: "",
  delivery_phone: "",
  delivery_time_from: "",
  delivery_time_to: "",
  delivery_remarks: "",
  save_delivery_to_addressbook: false,
  customer_reference: "",
  waybill_number: "",
  cmr_number: "",
  cargo_description: "",
  weight_kg: null,
  distance_km: null,
  price: null,
  notes: "",
};

const COUNTRIES = [
  "Nederland",
  "België",
  "Duitsland",
  "Frankrijk",
  "Luxemburg",
  "Verenigd Koninkrijk",
  "Spanje",
  "Italië",
  "Polen",
  "Oostenrijk",
  "Zwitserland",
  "Denemarken",
  "Zweden",
  "Noorwegen",
];

interface TripFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTrip: Trip | null;
  customers: Customer[];
  vehicles: Vehicle[];
  onSuccess: () => void;
}

export function TripFormDialog({
  open,
  onOpenChange,
  editingTrip,
  customers,
  vehicles,
  onSuccess,
}: TripFormDialogProps) {
  const [formData, setFormData] = useState<TripFormData>(emptyFormData);
  const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<AutoFilledFields>({
    pickup_address: false,
    pickup_city: false,
    delivery_address: false,
    delivery_city: false,
  });
  const distanceCalculatedRef = useRef(false);
  const { toast } = useToast();
  const { company } = useCompany();
  const { lookupPostcode, loading: postcodeLoading } = usePostcodeLookup();

  // Auto-calculate distance when both addresses are filled
  const calculateDistanceAuto = useCallback(async () => {
    // Only calculate if we have both addresses and haven't calculated yet
    if (
      !formData.pickup_address ||
      !formData.delivery_address ||
      distanceCalculatedRef.current ||
      formData.distance_km // Don't overwrite if already set
    ) {
      return;
    }

    setCalculatingDistance(true);
    try {
      const result = await calculateRouteDistance(
        formData.pickup_address,
        formData.pickup_postal_code,
        formData.pickup_city,
        formData.delivery_address,
        formData.delivery_postal_code,
        formData.delivery_city
      );

      if (result) {
        distanceCalculatedRef.current = true;
        setFormData((prev) => ({
          ...prev,
          distance_km: result.distance_km,
        }));
        toast({
          title: "Afstand berekend",
          description: `${result.distance_km} km (${result.duration_minutes} min rijden)`,
        });
      }
    } catch (error) {
      console.error("Error calculating distance:", error);
    } finally {
      setCalculatingDistance(false);
    }
  }, [formData.pickup_address, formData.pickup_postal_code, formData.pickup_city, formData.delivery_address, formData.delivery_postal_code, formData.delivery_city, formData.distance_km, toast]);

  // Trigger distance calculation when delivery address is filled
  useEffect(() => {
    if (formData.pickup_address && formData.delivery_address && !formData.distance_km) {
      const timer = setTimeout(() => {
        calculateDistanceAuto();
      }, 500); // Debounce to avoid too many API calls
      return () => clearTimeout(timer);
    }
  }, [formData.delivery_address, formData.delivery_city, calculateDistanceAuto]);

  // Fetch address book entries
  useEffect(() => {
    const fetchAddressBook = async () => {
      const { data } = await supabase
        .from("address_book")
        .select("*")
        .eq("is_active", true)
        .order("label");
      if (data) setAddressBook(data);
    };
    fetchAddressBook();
  }, []);

  // Reset form when dialog opens/closes or editing trip changes
  useEffect(() => {
    if (open) {
      if (editingTrip) {
        setFormData({
          customer_id: editingTrip.customer_id || "",
          vehicle_id: editingTrip.vehicle_id || "",
          trip_date: editingTrip.trip_date,
          status: editingTrip.status,
          pickup_postal_code: editingTrip.pickup_postal_code || "",
          pickup_house_number: editingTrip.pickup_house_number || "",
          pickup_address: editingTrip.pickup_address,
          pickup_city: editingTrip.pickup_city || "",
          pickup_country: editingTrip.pickup_country || "Nederland",
          pickup_company_name: editingTrip.pickup_company_name || "",
          pickup_contact_person: editingTrip.pickup_contact_person || "",
          pickup_phone: editingTrip.pickup_phone || "",
          pickup_time_from: editingTrip.pickup_time_from || "",
          pickup_time_to: editingTrip.pickup_time_to || "",
          pickup_remarks: editingTrip.pickup_remarks || "",
          save_pickup_to_addressbook: editingTrip.save_pickup_to_addressbook || false,
          delivery_postal_code: editingTrip.delivery_postal_code || "",
          delivery_house_number: editingTrip.delivery_house_number || "",
          delivery_address: editingTrip.delivery_address,
          delivery_city: editingTrip.delivery_city || "",
          delivery_country: editingTrip.delivery_country || "Nederland",
          delivery_company_name: editingTrip.delivery_company_name || "",
          delivery_contact_person: editingTrip.delivery_contact_person || "",
          delivery_phone: editingTrip.delivery_phone || "",
          delivery_time_from: editingTrip.delivery_time_from || "",
          delivery_time_to: editingTrip.delivery_time_to || "",
          delivery_remarks: editingTrip.delivery_remarks || "",
          save_delivery_to_addressbook: editingTrip.save_delivery_to_addressbook || false,
          customer_reference: editingTrip.customer_reference || "",
          waybill_number: editingTrip.waybill_number || "",
          cmr_number: editingTrip.cmr_number || "",
          cargo_description: editingTrip.cargo_description || "",
          weight_kg: editingTrip.weight_kg,
          distance_km: editingTrip.distance_km,
          price: editingTrip.price,
          notes: editingTrip.notes || "",
        });
      } else {
        setFormData(emptyFormData);
      }
      setAutoFilledFields({
        pickup_address: false,
        pickup_city: false,
        delivery_address: false,
        delivery_city: false,
      });
      distanceCalculatedRef.current = false; // Reset for new calculation
    }
  }, [open, editingTrip]);

  // Handle address book selection for pickup
  const handlePickupAddressBookSelect = (id: string) => {
    const entry = addressBook.find((a) => a.id === id);
    if (entry) {
      setFormData((prev) => ({
        ...prev,
        pickup_postal_code: entry.postal_code || "",
        pickup_house_number: entry.house_number || "",
        pickup_address: entry.street,
        pickup_city: entry.city || "",
        pickup_country: entry.country || "Nederland",
        pickup_company_name: entry.company_name || "",
        pickup_contact_person: entry.contact_name || "",
        pickup_phone: entry.phone || "",
      }));
      setAutoFilledFields((prev) => ({
        ...prev,
        pickup_address: true,
        pickup_city: true,
      }));
    }
  };

  // Handle address book selection for delivery
  const handleDeliveryAddressBookSelect = (id: string) => {
    const entry = addressBook.find((a) => a.id === id);
    if (entry) {
      setFormData((prev) => ({
        ...prev,
        delivery_postal_code: entry.postal_code || "",
        delivery_house_number: entry.house_number || "",
        delivery_address: entry.street,
        delivery_city: entry.city || "",
        delivery_country: entry.country || "Nederland",
        delivery_company_name: entry.company_name || "",
        delivery_contact_person: entry.contact_name || "",
        delivery_phone: entry.phone || "",
      }));
      setAutoFilledFields((prev) => ({
        ...prev,
        delivery_address: true,
        delivery_city: true,
      }));
    }
  };

  // Handle pickup postcode lookup
  const handlePickupPostcodeBlur = async () => {
    if (!formData.pickup_postal_code) return;
    const formatted = formatDutchPostcode(formData.pickup_postal_code);
    setFormData((prev) => ({ ...prev, pickup_postal_code: formatted }));

    const result = await lookupPostcode(formData.pickup_postal_code, formData.pickup_house_number);
    if (result) {
      setFormData((prev) => ({
        ...prev,
        pickup_postal_code: formatted,
        pickup_address: result.street || prev.pickup_address,
        pickup_city: result.city || prev.pickup_city,
      }));
      setAutoFilledFields((prev) => ({
        ...prev,
        pickup_address: !!result.street,
        pickup_city: !!result.city,
      }));
    }
  };

  // Handle delivery postcode lookup
  const handleDeliveryPostcodeBlur = async () => {
    if (!formData.delivery_postal_code) return;
    const formatted = formatDutchPostcode(formData.delivery_postal_code);
    setFormData((prev) => ({ ...prev, delivery_postal_code: formatted }));

    const result = await lookupPostcode(formData.delivery_postal_code, formData.delivery_house_number);
    if (result) {
      setFormData((prev) => ({
        ...prev,
        delivery_postal_code: formatted,
        delivery_address: result.street || prev.delivery_address,
        delivery_city: result.city || prev.delivery_city,
      }));
      setAutoFilledFields((prev) => ({
        ...prev,
        delivery_address: !!result.street,
        delivery_city: !!result.city,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pickup_address.trim() || !formData.delivery_address.trim()) {
      toast({
        title: "Ophaal- en afleveradres zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        customer_id: formData.customer_id || null,
        vehicle_id: formData.vehicle_id || null,
        trip_date: formData.trip_date,
        status: formData.status,
        pickup_postal_code: formData.pickup_postal_code || null,
        pickup_house_number: formData.pickup_house_number || null,
        pickup_address: formData.pickup_address,
        pickup_city: formData.pickup_city || null,
        pickup_country: formData.pickup_country || null,
        pickup_company_name: formData.pickup_company_name || null,
        pickup_contact_person: formData.pickup_contact_person || null,
        pickup_phone: formData.pickup_phone || null,
        pickup_time_from: formData.pickup_time_from || null,
        pickup_time_to: formData.pickup_time_to || null,
        pickup_remarks: formData.pickup_remarks || null,
        save_pickup_to_addressbook: formData.save_pickup_to_addressbook,
        delivery_postal_code: formData.delivery_postal_code || null,
        delivery_house_number: formData.delivery_house_number || null,
        delivery_address: formData.delivery_address,
        delivery_city: formData.delivery_city || null,
        delivery_country: formData.delivery_country || null,
        delivery_company_name: formData.delivery_company_name || null,
        delivery_contact_person: formData.delivery_contact_person || null,
        delivery_phone: formData.delivery_phone || null,
        delivery_time_from: formData.delivery_time_from || null,
        delivery_time_to: formData.delivery_time_to || null,
        delivery_remarks: formData.delivery_remarks || null,
        save_delivery_to_addressbook: formData.save_delivery_to_addressbook,
        customer_reference: formData.customer_reference || null,
        waybill_number: formData.waybill_number || null,
        cmr_number: formData.cmr_number || null,
        cargo_description: formData.cargo_description || null,
        weight_kg: formData.weight_kg,
        distance_km: formData.distance_km,
        price: formData.price,
        notes: formData.notes || null,
        company_id: company?.id,
      };

      // Save to address book if checked
      if (formData.save_pickup_to_addressbook && formData.pickup_address) {
        await supabase.from("address_book").insert({
          label: formData.pickup_company_name || formData.pickup_address,
          company_name: formData.pickup_company_name || null,
          contact_name: formData.pickup_contact_person || null,
          phone: formData.pickup_phone || null,
          street: formData.pickup_address,
          house_number: formData.pickup_house_number || null,
          postal_code: formData.pickup_postal_code || null,
          city: formData.pickup_city || null,
          country: formData.pickup_country || null,
        });
      }

      if (formData.save_delivery_to_addressbook && formData.delivery_address) {
        await supabase.from("address_book").insert({
          label: formData.delivery_company_name || formData.delivery_address,
          company_name: formData.delivery_company_name || null,
          contact_name: formData.delivery_contact_person || null,
          phone: formData.delivery_phone || null,
          street: formData.delivery_address,
          house_number: formData.delivery_house_number || null,
          postal_code: formData.delivery_postal_code || null,
          city: formData.delivery_city || null,
          country: formData.delivery_country || null,
        });
      }

      if (editingTrip) {
        const { error } = await supabase
          .from("trips")
          .update(dataToSave)
          .eq("id", editingTrip.id);
        if (error) throw error;
        toast({ title: "Rit bijgewerkt" });
      } else {
        const { error } = await supabase.from("trips").insert(dataToSave);
        if (error) throw error;
        toast({ title: "Rit toegevoegd" });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving trip:", error);
      toast({
        title: "Fout bij opslaan",
        description: error?.message || "Onbekende fout",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {editingTrip ? "Rit bewerken" : "Nieuwe rit"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header row: Customer, Vehicle, Date, Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Klant</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Voertuig</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={(value) => setFormData({ ...formData, vehicle_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.license_plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Datum *</Label>
              <Input
                type="date"
                value={formData.trip_date}
                onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: TripStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gepland">Gepland</SelectItem>
                  <SelectItem value="onderweg">Onderweg</SelectItem>
                  <SelectItem value="afgerond">Afgerond</SelectItem>
                  <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Document references row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 md:col-span-3 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Documentreferenties</span>
            </div>
            <div className="space-y-2">
              <Label>Referentie klant</Label>
              <Input
                value={formData.customer_reference}
                onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
                placeholder="Klantreferentie"
              />
            </div>
            <div className="space-y-2">
              <Label>Vrachtbriefnummer</Label>
              <Input
                value={formData.waybill_number}
                onChange={(e) => setFormData({ ...formData, waybill_number: e.target.value })}
                placeholder="Vrachtbrief nr."
              />
            </div>
            <div className="space-y-2">
              <Label>CMR nummer</Label>
              <Input
                value={formData.cmr_number}
                onChange={(e) => setFormData({ ...formData, cmr_number: e.target.value })}
                placeholder="CMR nr."
              />
            </div>
          </div>

          {/* Tabs for Pickup and Delivery */}
          <Tabs defaultValue="pickup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pickup" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ophalen
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Afleveren
              </TabsTrigger>
            </TabsList>

            {/* Pickup Tab */}
            <TabsContent value="pickup" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Row 1: Adresboek, Referentie klant, Bedrijfsnaam */}
                <div className="space-y-2">
                  <Label>Adresboek</Label>
                  <Select onValueChange={handlePickupAddressBookSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kies uit adresboek" />
                    </SelectTrigger>
                    <SelectContent>
                      {addressBook.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label} - {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Bedrijfsnaam
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input
                    value={formData.pickup_company_name}
                    onChange={(e) => setFormData({ ...formData, pickup_company_name: e.target.value })}
                    placeholder="Bedrijfsnaam"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contactpersoon</Label>
                  <Input
                    value={formData.pickup_contact_person}
                    onChange={(e) => setFormData({ ...formData, pickup_contact_person: e.target.value })}
                    placeholder="Contactpersoon"
                  />
                </div>

                {/* Row 2: Land, Postcode + Huisnr */}
                <div className="space-y-2">
                  <Label>Land</Label>
                  <Select
                    value={formData.pickup_country}
                    onValueChange={(value) => setFormData({ ...formData, pickup_country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Postcode
                    {postcodeLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  </Label>
                  <Input
                    value={formData.pickup_postal_code}
                    onChange={(e) => setFormData({ ...formData, pickup_postal_code: e.target.value.toUpperCase() })}
                    onBlur={handlePickupPostcodeBlur}
                    placeholder="1234 AB"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Huisnr.</Label>
                  <Input
                    value={formData.pickup_house_number}
                    onChange={(e) => setFormData({ ...formData, pickup_house_number: e.target.value })}
                    onBlur={handlePickupPostcodeBlur}
                    placeholder="123"
                  />
                </div>

                {/* Row 3: Straat, Woonplaats */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    Adres *
                    {autoFilledFields.pickup_address && <Check className="h-3 w-3 text-success" />}
                  </Label>
                  <Input
                    value={formData.pickup_address}
                    onChange={(e) => {
                      setFormData({ ...formData, pickup_address: e.target.value });
                      setAutoFilledFields((prev) => ({ ...prev, pickup_address: false }));
                    }}
                    required
                    className={autoFilledFields.pickup_address ? "border-success/50 bg-success/5" : ""}
                    placeholder="Straatnaam"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Woonplaats
                    {autoFilledFields.pickup_city && <Check className="h-3 w-3 text-success" />}
                  </Label>
                  <Input
                    value={formData.pickup_city}
                    onChange={(e) => {
                      setFormData({ ...formData, pickup_city: e.target.value });
                      setAutoFilledFields((prev) => ({ ...prev, pickup_city: false }));
                    }}
                    className={autoFilledFields.pickup_city ? "border-success/50 bg-success/5" : ""}
                    placeholder="Plaatsnaam"
                  />
                </div>

                {/* Row 4: Telefoon, Datum & Tijd */}
                <div className="space-y-2">
                  <Label>Telefoonnummer</Label>
                  <Input
                    value={formData.pickup_phone}
                    onChange={(e) => setFormData({ ...formData, pickup_phone: e.target.value })}
                    placeholder="+31 6 12345678"
                    type="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tijd van</Label>
                  <Input
                    type="time"
                    value={formData.pickup_time_from}
                    onChange={(e) => setFormData({ ...formData, pickup_time_from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tijd tot</Label>
                  <Input
                    type="time"
                    value={formData.pickup_time_to}
                    onChange={(e) => setFormData({ ...formData, pickup_time_to: e.target.value })}
                  />
                </div>

                {/* Row 5: Opmerkingen */}
                <div className="space-y-2 md:col-span-3">
                  <Label>Opmerkingen ophalen</Label>
                  <Textarea
                    value={formData.pickup_remarks}
                    onChange={(e) => setFormData({ ...formData, pickup_remarks: e.target.value })}
                    rows={2}
                    placeholder="Speciale instructies voor ophalen..."
                  />
                </div>

                {/* Save to address book */}
                <div className="flex items-center space-x-2 md:col-span-3">
                  <Checkbox
                    id="save_pickup"
                    checked={formData.save_pickup_to_addressbook}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, save_pickup_to_addressbook: checked === true })
                    }
                  />
                  <label htmlFor="save_pickup" className="text-sm text-muted-foreground cursor-pointer">
                    Toevoegen aan adresboek
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* Delivery Tab */}
            <TabsContent value="delivery" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Row 1: Adresboek, Bedrijfsnaam, Contactpersoon */}
                <div className="space-y-2">
                  <Label>Adresboek</Label>
                  <Select onValueChange={handleDeliveryAddressBookSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kies uit adresboek" />
                    </SelectTrigger>
                    <SelectContent>
                      {addressBook.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label} - {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Bedrijfsnaam
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input
                    value={formData.delivery_company_name}
                    onChange={(e) => setFormData({ ...formData, delivery_company_name: e.target.value })}
                    placeholder="Bedrijfsnaam"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contactpersoon</Label>
                  <Input
                    value={formData.delivery_contact_person}
                    onChange={(e) => setFormData({ ...formData, delivery_contact_person: e.target.value })}
                    placeholder="Contactpersoon"
                  />
                </div>

                {/* Row 2: Land, Postcode + Huisnr */}
                <div className="space-y-2">
                  <Label>Land</Label>
                  <Select
                    value={formData.delivery_country}
                    onValueChange={(value) => setFormData({ ...formData, delivery_country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Postcode
                    {postcodeLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  </Label>
                  <Input
                    value={formData.delivery_postal_code}
                    onChange={(e) => setFormData({ ...formData, delivery_postal_code: e.target.value.toUpperCase() })}
                    onBlur={handleDeliveryPostcodeBlur}
                    placeholder="1234 AB"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Huisnr.</Label>
                  <Input
                    value={formData.delivery_house_number}
                    onChange={(e) => setFormData({ ...formData, delivery_house_number: e.target.value })}
                    onBlur={handleDeliveryPostcodeBlur}
                    placeholder="123"
                  />
                </div>

                {/* Row 3: Straat, Woonplaats */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    Adres *
                    {autoFilledFields.delivery_address && <Check className="h-3 w-3 text-success" />}
                  </Label>
                  <Input
                    value={formData.delivery_address}
                    onChange={(e) => {
                      setFormData({ ...formData, delivery_address: e.target.value });
                      setAutoFilledFields((prev) => ({ ...prev, delivery_address: false }));
                    }}
                    required
                    className={autoFilledFields.delivery_address ? "border-success/50 bg-success/5" : ""}
                    placeholder="Straatnaam"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Woonplaats
                    {autoFilledFields.delivery_city && <Check className="h-3 w-3 text-success" />}
                  </Label>
                  <Input
                    value={formData.delivery_city}
                    onChange={(e) => {
                      setFormData({ ...formData, delivery_city: e.target.value });
                      setAutoFilledFields((prev) => ({ ...prev, delivery_city: false }));
                    }}
                    className={autoFilledFields.delivery_city ? "border-success/50 bg-success/5" : ""}
                    placeholder="Plaatsnaam"
                  />
                </div>

                {/* Row 4: Telefoon, Datum & Tijd */}
                <div className="space-y-2">
                  <Label>Telefoonnummer</Label>
                  <Input
                    value={formData.delivery_phone}
                    onChange={(e) => setFormData({ ...formData, delivery_phone: e.target.value })}
                    placeholder="+31 6 12345678"
                    type="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tijd van</Label>
                  <Input
                    type="time"
                    value={formData.delivery_time_from}
                    onChange={(e) => setFormData({ ...formData, delivery_time_from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tijd tot</Label>
                  <Input
                    type="time"
                    value={formData.delivery_time_to}
                    onChange={(e) => setFormData({ ...formData, delivery_time_to: e.target.value })}
                  />
                </div>

                {/* Row 5: Opmerkingen */}
                <div className="space-y-2 md:col-span-3">
                  <Label>Opmerkingen afleveren</Label>
                  <Textarea
                    value={formData.delivery_remarks}
                    onChange={(e) => setFormData({ ...formData, delivery_remarks: e.target.value })}
                    rows={2}
                    placeholder="Speciale instructies voor afleveren..."
                  />
                </div>

                {/* Save to address book */}
                <div className="flex items-center space-x-2 md:col-span-3">
                  <Checkbox
                    id="save_delivery"
                    checked={formData.save_delivery_to_addressbook}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, save_delivery_to_addressbook: checked === true })
                    }
                  />
                  <label htmlFor="save_delivery" className="text-sm text-muted-foreground cursor-pointer">
                    Toevoegen aan adresboek
                  </label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Cargo details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 col-span-2 md:col-span-4 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Ladinggegevens</span>
            </div>
            <div className="space-y-2 col-span-2 md:col-span-4">
              <Label>Lading omschrijving</Label>
              <Input
                value={formData.cargo_description}
                onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
                placeholder="Omschrijving van de lading"
              />
            </div>
            <div className="space-y-2">
              <Label>Gewicht (kg)</Label>
              <Input
                type="number"
                value={formData.weight_kg || ""}
                onChange={(e) =>
                  setFormData({ ...formData, weight_kg: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Afstand (km)
                {calculatingDistance && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                {formData.distance_km && !calculatingDistance && <Route className="h-3 w-3 text-success" />}
              </Label>
              <Input
                type="number"
                value={formData.distance_km || ""}
                onChange={(e) =>
                  setFormData({ ...formData, distance_km: e.target.value ? Number(e.target.value) : null })
                }
                placeholder={calculatingDistance ? "Berekenen..." : "0"}
                className={formData.distance_km ? "border-success/50 bg-success/5" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Prijs (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label>Notities</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Interne notities"
              />
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opslaan...
                </>
              ) : (
                "Opslaan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
