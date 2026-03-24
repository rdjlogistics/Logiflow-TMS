import React from 'react';
import { ActionCardWrapper, GovernanceStatus } from './ActionCardWrapper';
import { Calendar, Truck, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Assignment {
  orderId: string;
  orderNumber: string;
  driverName: string;
  vehiclePlate: string;
  pickupTime: string;
  deliveryTime: string;
  status: 'assigned' | 'in_transit' | 'completed';
}

interface PlanDayCardProps {
  date: string;
  totalOrders: number;
  assignedOrders: number;
  assignments: Assignment[];
  totalKm: number;
  emptyKm: number;
  governance?: GovernanceStatus;
  onExecute?: () => void;
  onRequestApproval?: () => void;
  onExplain?: () => void;
}

export const PlanDayCard: React.FC<PlanDayCardProps> = ({
  date,
  totalOrders,
  assignedOrders,
  assignments,
  totalKm,
  emptyKm,
  governance,
  onExecute,
  onRequestApproval,
  onExplain,
}) => {
  const assignmentPercentage = totalOrders > 0 ? (assignedOrders / totalOrders) * 100 : 0;
  const emptyKmPercentage = totalKm > 0 ? (emptyKm / totalKm) * 100 : 0;

  return (
    <ActionCardWrapper
      title={`Planning ${date}`}
      icon={<Calendar className="h-4 w-4 text-primary" />}
      cardType="PLAN_DAY"
      governance={governance}
      onExecute={onExecute}
      onRequestApproval={onRequestApproval}
      onExplain={onExplain}
    >
      <div className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Orders toegewezen</span>
              <span className="font-medium">{assignedOrders}/{totalOrders}</span>
            </div>
            <Progress value={assignmentPercentage} className="h-1.5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Lege km</span>
              <span className="font-medium">{emptyKm} / {totalKm} km</span>
            </div>
            <Progress value={emptyKmPercentage} className="h-1.5" />
          </div>
        </div>

        {/* Assignments List */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {assignments.slice(0, 5).map((assignment) => (
            <div
              key={assignment.orderId}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs"
            >
              <Truck className="h-3 w-3 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{assignment.orderNumber}</span>
                  <Badge variant="outline" className="text-[10px] px-1">
                    {assignment.vehiclePlate}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {assignment.pickupTime} - {assignment.deliveryTime}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-medium">{assignment.driverName}</div>
                <Badge
                  variant={assignment.status === 'completed' ? 'default' : 'secondary'}
                  className="text-[10px]"
                >
                  {assignment.status === 'assigned' && 'Gepland'}
                  {assignment.status === 'in_transit' && 'Onderweg'}
                  {assignment.status === 'completed' && 'Afgerond'}
                </Badge>
              </div>
            </div>
          ))}
          {assignments.length > 5 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              +{assignments.length - 5} meer toewijzingen
            </div>
          )}
        </div>
      </div>
    </ActionCardWrapper>
  );
};
