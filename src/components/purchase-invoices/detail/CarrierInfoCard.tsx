import { Truck, MapPin, Building2, CreditCard, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PremiumGlassCard, SectionHeader } from "./PremiumGlassCard";
import { toast } from "sonner";

interface CarrierInfoCardProps {
  carrier: {
    id?: string;
    company_name: string;
    contact_name?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    vat_number?: string | null;
    iban?: string | null;
  };
}

export const CarrierInfoCard = ({ carrier }: CarrierInfoCardProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success("Gekopieerd naar klembord");
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <PremiumGlassCard variant="default">
      <SectionHeader 
        icon={Truck} 
        title="Charter"
        badge={
          carrier.id && (
            <Link to={`/carriers/${carrier.id}`}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary"
              >
                Bekijken
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          )
        }
      />
      
      <div className="p-6 pt-2 space-y-5">
        {/* Company name with premium styling */}
        <div
        >
          <p className="font-bold text-xl text-foreground tracking-tight">{carrier.company_name}</p>
          {carrier.contact_name && (
            <p className="text-sm text-muted-foreground mt-1">{carrier.contact_name}</p>
          )}
        </div>
        
        {/* Address with icon */}
        {carrier.address && (
          <div 
            className="flex items-start gap-3"}
          >
            <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border/50">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>{carrier.address}</p>
              <p>{carrier.postal_code} {carrier.city}</p>
            </div>
          </div>
        )}
        
        {/* VAT and IBAN with copy functionality */}
        {(carrier.vat_number || carrier.iban) && (
          <div className="pt-4 mt-4 border-t border-border/40 space-y-4">
            {carrier.vat_number && (
              <div
                className="group"}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border/50">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">BTW-nummer</p>
                      <p className="text-sm font-semibold text-foreground">{carrier.vat_number}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopy(carrier.vat_number!, 'vat')}
                  >
                    {copiedField === 'vat' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
            {carrier.iban && (
              <div
                className="group"}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border/50">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">IBAN</p>
                      <p className="text-sm font-semibold text-foreground font-mono tracking-wider">{carrier.iban}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopy(carrier.iban!, 'iban')}
                  >
                    {copiedField === 'iban' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PremiumGlassCard>
  );
};
