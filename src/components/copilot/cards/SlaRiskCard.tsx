import React from 'react';
import { ActionCardWrapper } from './ActionCardWrapper';
import { AlertCircle, Clock, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SlaRisk {
  orderId: string;
  orderNumber: string;
  customerName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  eta: string;
  slaDeadline: string;
  minutesLate: number;
  reason: string;
}

interface SlaRiskCardProps {
  risks: SlaRisk[];
  onViewOrder?: (orderId: string) => void;
}

const riskColors = {
  low: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  medium: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
  critical: 'bg-red-600/20 text-red-700 border-red-600/30',
};

const riskLabels = {
  low: 'Laag',
  medium: 'Matig',
  high: 'Hoog',
  critical: 'Kritiek',
};

export const SlaRiskCard: React.FC<SlaRiskCardProps> = ({ risks, onViewOrder }) => {
  if (risks.length === 0) {
    return (
      <ActionCardWrapper
        title="Geen SLA risico's"
        icon={<AlertCircle className="h-4 w-4 text-green-500" />}
        cardType="SLA_RISK"
        status="executed"
      >
        <div className="text-xs text-muted-foreground text-center py-2">
          Alle leveringen liggen op schema.
        </div>
      </ActionCardWrapper>
    );
  }

  const criticalCount = risks.filter(r => r.riskLevel === 'critical').length;
  const highCount = risks.filter(r => r.riskLevel === 'high').length;

  return (
    <ActionCardWrapper
      title={`${risks.length} SLA Risico${risks.length > 1 ? "'s" : ''}`}
      icon={<AlertCircle className="h-4 w-4 text-red-500" />}
      cardType="SLA_RISK"
      status={criticalCount > 0 ? 'blocked' : 'preview'}
    >
      <div className="space-y-2">
        {/* Summary */}
        <div className="flex gap-2 text-xs">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {criticalCount} Kritiek
            </Badge>
          )}
          {highCount > 0 && (
            <Badge className="text-[10px] bg-orange-500">
              {highCount} Hoog
            </Badge>
          )}
        </div>

        {/* Risks List */}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {risks.slice(0, 5).map((risk) => (
            <div
              key={risk.orderId}
              className={`p-2 rounded-md border cursor-pointer hover:opacity-80 transition-opacity ${riskColors[risk.riskLevel]}`}
              onClick={() => onViewOrder?.(risk.orderId)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{risk.orderNumber}</span>
                    <Badge variant="outline" className="text-[10px] px-1">
                      {riskLabels[risk.riskLevel]}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {risk.customerName}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingDown className="h-3 w-3" />
                    <span className="font-medium">+{risk.minutesLate} min</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                    SLA: {risk.slaDeadline}
                  </div>
                </div>
              </div>
              <div className="text-[10px] mt-1 opacity-80">
                {risk.reason}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ActionCardWrapper>
  );
};
