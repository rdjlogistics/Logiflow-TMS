import React from 'react';
import { ActionCardWrapper } from './ActionCardWrapper';
import { AlertTriangle, Clock, Users, CreditCard, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Conflict {
  id: string;
  type: 'time_window' | 'capacity' | 'credit_hold' | 'driver_unavailable' | 'vehicle_unavailable';
  severity: 'low' | 'medium' | 'high';
  orderNumber?: string;
  description: string;
  suggestion?: string;
}

interface ConflictsCardProps {
  conflicts: Conflict[];
  onResolve?: (conflictId: string) => void;
}

const conflictIcons = {
  time_window: Clock,
  capacity: Truck,
  credit_hold: CreditCard,
  driver_unavailable: Users,
  vehicle_unavailable: Truck,
};

const conflictLabels = {
  time_window: 'Tijdvenster',
  capacity: 'Capaciteit',
  credit_hold: 'Credit Hold',
  driver_unavailable: 'Chauffeur',
  vehicle_unavailable: 'Voertuig',
};

const severityColors = {
  low: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  medium: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export const ConflictsCard: React.FC<ConflictsCardProps> = ({ conflicts, onResolve }) => {
  if (conflicts.length === 0) {
    return (
      <ActionCardWrapper
        title="Geen conflicten"
        icon={<AlertTriangle className="h-4 w-4 text-green-500" />}
        cardType="CONFLICTS"
        status="executed"
      >
        <div className="text-xs text-muted-foreground text-center py-2">
          Alle orders kunnen worden gepland zonder conflicten.
        </div>
      </ActionCardWrapper>
    );
  }

  return (
    <ActionCardWrapper
      title={`${conflicts.length} Conflict${conflicts.length > 1 ? 'en' : ''}`}
      icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
      cardType="CONFLICTS"
      status={conflicts.some(c => c.severity === 'high') ? 'blocked' : 'preview'}
    >
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {conflicts.map((conflict) => {
          const Icon = conflictIcons[conflict.type];
          return (
            <div
              key={conflict.id}
              className={`p-2 rounded-md border ${severityColors[conflict.severity]}`}
            >
              <div className="flex items-start gap-2">
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px] px-1">
                      {conflictLabels[conflict.type]}
                    </Badge>
                    {conflict.orderNumber && (
                      <span className="text-xs font-medium">{conflict.orderNumber}</span>
                    )}
                  </div>
                  <p className="text-xs">{conflict.description}</p>
                  {conflict.suggestion && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      💡 {conflict.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ActionCardWrapper>
  );
};
