import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  MapPin, 
  Calendar, 
  Truck, 
  Package, 
  Euro, 
  Phone, 
  Mail, 
  User,
  Sparkles,
  MessageCircle,
  ArrowRight,
  Weight,
  Box,
  Ruler,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FreightListing } from "@/hooks/useFreightMarketplace";
import { useToast } from "@/hooks/use-toast";

interface ListingDetailDrawerProps {
  listing: FreightListing | null;
  onClose: () => void;
  onFindMatches: (listingId: string) => void;
  isMatching: boolean;
}

const vehicleTypeLabels: Record<string, string> = {
  bakwagen: "Bakwagen",
  trekker: "Trekker + Oplegger",
  vrachtwagen: "Vrachtwagen",
  bestelbus: "Bestelbus",
  koelwagen: "Koelwagen",
  dieplader: "Dieplader",
  containerwagen: "Containerwagen",
};

const priceTypeLabels: Record<string, string> = {
  fixed: "Vaste prijs",
  negotiable: "Onderhandelbaar",
  per_km: "Per kilometer",
};

export function ListingDetailDrawer({ 
  listing, 
  onClose, 
  onFindMatches,
  isMatching,
}: ListingDetailDrawerProps) {
  const { toast } = useToast();

  if (!listing) return null;

  const isCapacity = listing.listing_type === "capacity";

  const handleContact = () => {
    toast({
      title: "Contact opnemen",
      description: "Je wordt doorverbonden met de aanbieder...",
    });
  };

  return (
    <Sheet open={!!listing} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <Badge 
              variant="outline"
              className={isCapacity 
                ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }
            >
              {isCapacity ? (
                <><Truck className="h-3 w-3 mr-1" /> Capaciteit</>
              ) : (
                <><Package className="h-3 w-3 mr-1" /> Lading</>
              )}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetTitle className="text-left">
            {listing.origin_city} → {listing.destination_city}
          </SheetTitle>
          <SheetDescription className="text-left">
            {listing.company?.name || "Anoniem"} • {listing.company?.city}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Route */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Route
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <MapPin className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{listing.origin_city}</p>
                  <p className="text-sm text-muted-foreground">{listing.origin_address}</p>
                  {listing.origin_postal_code && (
                    <p className="text-xs text-muted-foreground">{listing.origin_postal_code}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">{listing.destination_city}</p>
                  <p className="text-sm text-muted-foreground">{listing.destination_address}</p>
                  {listing.destination_postal_code && (
                    <p className="text-xs text-muted-foreground">{listing.destination_postal_code}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Datum & Tijd
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Ophalen</p>
                  <p className="font-medium">
                    {format(new Date(listing.pickup_date), "d MMMM yyyy", { locale: nl })}
                  </p>
                </div>
              </div>
              {listing.delivery_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bezorgen</p>
                    <p className="font-medium">
                      {format(new Date(listing.delivery_date), "d MMMM yyyy", { locale: nl })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Capacity/Load Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {isCapacity ? "Beschikbare Capaciteit" : "Lading Details"}
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              {listing.vehicle_type && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Voertuig</p>
                    <p className="font-medium">
                      {vehicleTypeLabels[listing.vehicle_type] || listing.vehicle_type}
                    </p>
                  </div>
                </div>
              )}
              {listing.weight_kg && (
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Gewicht</p>
                    <p className="font-medium">{listing.weight_kg.toLocaleString()} kg</p>
                  </div>
                </div>
              )}
              {listing.volume_m3 && (
                <div className="flex items-center gap-2">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Volume</p>
                    <p className="font-medium">{listing.volume_m3} m³</p>
                  </div>
                </div>
              )}
              {listing.loading_meters && (
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Laadmeters</p>
                    <p className="font-medium">{listing.loading_meters} ldm</p>
                  </div>
                </div>
              )}
              {listing.goods_type && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Goederen</p>
                    <p className="font-medium">{listing.goods_type}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Prijs
            </h4>
            
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">
                    {listing.price_type && priceTypeLabels[listing.price_type]}
                  </span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {listing.price_amount 
                    ? `€${listing.price_amount.toLocaleString()}`
                    : "Op aanvraag"
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Contact */}
          {(listing.contact_name || listing.contact_phone || listing.contact_email) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Contact
                </h4>
                
                <div className="space-y-2">
                  {listing.contact_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{listing.contact_name}</span>
                    </div>
                  )}
                  {listing.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${listing.contact_phone}`} className="text-primary hover:underline">
                        {listing.contact_phone}
                      </a>
                    </div>
                  )}
                  {listing.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${listing.contact_email}`} className="text-primary hover:underline">
                        {listing.contact_email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {listing.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Opmerkingen
                </h4>
                <p className="text-sm text-muted-foreground">{listing.notes}</p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={handleContact}
            >
              <MessageCircle className="h-4 w-4" />
              Contact
            </Button>
            <Button 
              className="flex-1 gap-2"
              onClick={() => onFindMatches(listing.id)}
              disabled={isMatching}
            >
              <Sparkles className="h-4 w-4" />
              {isMatching ? "Zoeken..." : "Vind Matches"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
