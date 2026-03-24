import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ParkingCircle, 
  Shield, 
  ShieldOff, 
  Truck, 
  Car, 
  Navigation,
  Bath,
  UtensilsCrossed,
  Wifi,
  Fuel,
  AlertCircle,
  MapPin,
  Lightbulb,
  Camera,
  Store,
  Zap,
  Coffee
} from "lucide-react";
import type { ParkingLocation, ParkingFacility } from "@/services/parking/types";
import { hapticNavigate } from "@/lib/haptics";

interface ParkingInfoSheetProps {
  location: ParkingLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const facilityConfig: Record<ParkingFacility, { icon: typeof Coffee; label: string }> = {
  wc: { icon: Coffee, label: "Toilet" },
  shower: { icon: Bath, label: "Douche" },
  restaurant: { icon: UtensilsCrossed, label: "Restaurant" },
  shop: { icon: Store, label: "Winkel" },
  wifi: { icon: Wifi, label: "WiFi" },
  security: { icon: Shield, label: "Beveiliging" },
  camera: { icon: Camera, label: "Camera's" },
  lighting: { icon: Lightbulb, label: "Verlichting" },
  fuel: { icon: Fuel, label: "Tankstation" },
  charging: { icon: Zap, label: "Laadpaal" },
  rest_area: { icon: Coffee, label: "Rustplaats" },
};

const typeLabels: Record<string, string> = {
  truck: "Truckparkeren",
  car: "Personenauto",
  mixed: "Gemengd",
};

export function ParkingInfoSheet({ location, open, onOpenChange }: ParkingInfoSheetProps) {
  if (!location) return null;

  const handleNavigate = () => {
    hapticNavigate();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    window.open(url, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
              <ParkingCircle className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg truncate">{location.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">
                  {location.type === "truck" ? (
                    <Truck className="h-3 w-3 mr-1" />
                  ) : (
                    <Car className="h-3 w-3 mr-1" />
                  )}
                  {typeLabels[location.type] || location.type}
                </Badge>
                {location.isSecured && (
                  <Badge className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                    <Shield className="h-3 w-3 mr-1" />
                    Bewaakt
                  </Badge>
                )}
                {!location.isSecured && (
                  <Badge variant="outline" className="text-[10px]">
                    <ShieldOff className="h-3 w-3 mr-1" />
                    Onbewaakt
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 overflow-y-auto pb-safe">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-muted/50 text-center">
              <p className="text-lg font-bold text-primary">
                {location.capacityTotal ?? "?"}
              </p>
              <p className="text-[10px] text-muted-foreground">Plaatsen</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 text-center">
              <p className="text-lg font-bold text-primary">
                {location.isFree ? "Gratis" : "Betaald"}
              </p>
              <p className="text-[10px] text-muted-foreground">Tarief</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 text-center">
              <p className="text-lg font-bold text-primary">
                {location.facilities.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Voorzieningen</p>
            </div>
          </div>

          {/* Address */}
          {location.address && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm">{location.address}</p>
            </div>
          )}

          <Separator />

          {/* Facilities */}
          {location.facilities.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Voorzieningen</h4>
              <div className="flex flex-wrap gap-2">
                {location.facilities.map((facility) => {
                  const config = facilityConfig[facility];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <div
                      key={facility}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Beschikbaarheid kan variëren. Controleer actuele bezetting ter plaatse.
            </p>
          </div>

          {/* Navigate button */}
          <Button
            onClick={handleNavigate}
            className="w-full h-12 gap-2"
            size="lg"
          >
            <Navigation className="h-5 w-5" />
            Navigeer hierheen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
