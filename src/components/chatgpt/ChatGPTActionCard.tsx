import { AlertTriangle, Check, X, Eye, Truck, FileText, Mail, Package, Shield } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ActionPreview {
  type: string;
  summary: string;
  details: Record<string, any>;
}

interface ChatGPTActionCardProps {
  preview: ActionPreview;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  driver_assign: { icon: <Truck className="w-4 h-4" />, color: "text-blue-500", label: "Chauffeur toewijzen" },
  status_change: { icon: <Package className="w-4 h-4" />, color: "text-amber-500", label: "Status wijzigen" },
  invoice_create: { icon: <FileText className="w-4 h-4" />, color: "text-green-500", label: "Factuur aanmaken" },
  email_send: { icon: <Mail className="w-4 h-4" />, color: "text-purple-500", label: "E-mail versturen" },
  bulk_update: { icon: <Package className="w-4 h-4" />, color: "text-orange-500", label: "Bulk wijziging" },
  claim_create: { icon: <Shield className="w-4 h-4" />, color: "text-red-500", label: "Schadeclaim" },
  order_create: { icon: <FileText className="w-4 h-4" />, color: "text-primary", label: "Order aanmaken" },
};

export const ChatGPTActionCard = ({ 
  preview, 
  onConfirm, 
  onCancel, 
  isLoading 
}: ChatGPTActionCardProps) => {
  const config = TYPE_CONFIG[preview.type] || { icon: <Eye className="w-4 h-4" />, color: "text-muted-foreground", label: "Actie" };

  return (
    <Card className="border-warning/50 bg-warning/5 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <CardTitle className="text-base">Bevestiging vereist</CardTitle>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5">
          <span className={config.color}>{config.icon}</span>
          {config.label}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="font-medium text-sm">{preview.summary}</p>
        
        <div className="bg-background rounded-lg p-3 space-y-2">
          {Object.entries(preview.details).map(([key, value]) => {
            if (value === null || value === undefined) return null;
            return (
              <div key={key} className="flex justify-between text-sm gap-2">
                <span className="text-muted-foreground capitalize whitespace-nowrap">
                  {key.replace(/_/g, ' ')}:
                </span>
                <span className="font-medium text-right max-w-[65%] truncate">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-1" />
          Annuleren
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          <Check className="w-4 h-4 mr-1" />
          Bevestigen
        </Button>
      </CardFooter>
    </Card>
  );
};
