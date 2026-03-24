import React from 'react';
import { ActionCardWrapper, GovernanceStatus } from './ActionCardWrapper';
import { Users, Truck, Star, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DriverOption {
  driverId: string;
  driverName: string;
  vehiclePlate?: string;
  reliabilityScore: number;
  eta: string;
  distance: number;
  isRecommended?: boolean;
  reasons?: string[];
}

interface AssignmentPreviewCardProps {
  orderNumber: string;
  pickupAddress: string;
  deliveryAddress: string;
  options: DriverOption[];
  selectedDriverId?: string;
  onSelectDriver?: (driverId: string) => void;
  governance?: GovernanceStatus;
  onExecute?: () => void;
  onRequestApproval?: () => void;
  onExplain?: () => void;
}

export const AssignmentPreviewCard: React.FC<AssignmentPreviewCardProps> = ({
  orderNumber,
  pickupAddress,
  deliveryAddress,
  options,
  selectedDriverId,
  onSelectDriver,
  governance,
  onExecute,
  onRequestApproval,
  onExplain,
}) => {
  return (
    <ActionCardWrapper
      title={`Toewijzing ${orderNumber}`}
      icon={<Users className="h-4 w-4 text-primary" />}
      cardType="ASSIGNMENT_PREVIEW"
      governance={governance}
      onExecute={onExecute}
      onRequestApproval={onRequestApproval}
      onExplain={onExplain}
    >
      <div className="space-y-3">
        {/* Route Info */}
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground truncate">{pickupAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground truncate">{deliveryAddress}</span>
          </div>
        </div>

        {/* Driver Options */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.driverId}
              onClick={() => onSelectDriver?.(option.driverId)}
              className={`p-2 rounded-md border cursor-pointer transition-all ${
                selectedDriverId === option.driverId
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 hover:border-border'
              } ${option.isRecommended ? 'ring-1 ring-green-500/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{option.driverName}</span>
                    {option.isRecommended && (
                      <Badge className="text-[10px] px-1 bg-green-500">
                        Aanbevolen
                      </Badge>
                    )}
                  </div>
                  {option.vehiclePlate && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Truck className="h-2.5 w-2.5" />
                      {option.vehiclePlate}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{option.reliabilityScore}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {option.eta}
                  </div>
                </div>
              </div>
              {option.reasons && option.reasons.length > 0 && (
                <div className="mt-1.5 text-[10px] text-muted-foreground space-y-0.5">
                  {option.reasons.slice(0, 2).map((reason, i) => (
                    <div key={i}>• {reason}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ActionCardWrapper>
  );
};
