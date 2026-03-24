import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Shield, Truck } from 'lucide-react';

interface CarrierProfileTabProps {
  carrierName: string;
  contactName: string;
  portalRole: string;
  onLogout: () => void;
}

const roleLabels: Record<string, string> = {
  viewer: 'Alleen inzien',
  driver: 'Chauffeur',
  admin: 'Beheerder',
};

const CarrierProfileTab = ({ carrierName, contactName, portalRole, onLogout }: CarrierProfileTabProps) => {
  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Profiel</h2>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{contactName}</p>
              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{carrierName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Rol:</span>
            <Badge variant="secondary">{roleLabels[portalRole] || portalRole}</Badge>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={onLogout}>
        <LogOut className="h-4 w-4 mr-2" /> Uitloggen
      </Button>
    </div>
  );
};

export default CarrierProfileTab;
