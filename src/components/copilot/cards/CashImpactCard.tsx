import React from 'react';
import { ActionCardWrapper } from './ActionCardWrapper';
import { Banknote, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CashImpactCardProps {
  currentBalance: number;
  projectedBalance: number;
  bufferThreshold: number;
  incomingTotal: number;
  outgoingTotal: number;
  breachWarning?: boolean;
  currency?: string;
}

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const CashImpactCard: React.FC<CashImpactCardProps> = ({
  currentBalance,
  projectedBalance,
  bufferThreshold,
  incomingTotal,
  outgoingTotal,
  breachWarning = false,
  currency = 'EUR',
}) => {
  const bufferPercentage = Math.min(100, (projectedBalance / bufferThreshold) * 100);
  const isHealthy = projectedBalance >= bufferThreshold;

  return (
    <ActionCardWrapper
      title="Cash Impact"
      icon={<Banknote className="h-4 w-4 text-green-500" />}
      cardType="CASH_IMPACT"
      status={breachWarning ? 'blocked' : 'preview'}
      governance={breachWarning ? { canExecute: false, requiresApproval: false, blockedReasons: ['Cash buffer zou onder minimum komen'] } : undefined}
    >
      <div className="space-y-3">
        {/* Balance Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-md bg-muted/30">
            <div className="text-[10px] text-muted-foreground">Huidig saldo</div>
            <div className="text-sm font-semibold">{formatCurrency(currentBalance, currency)}</div>
          </div>
          <div className={`p-2 rounded-md ${isHealthy ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <div className="text-[10px] text-muted-foreground">Na actie</div>
            <div className={`text-sm font-semibold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(projectedBalance, currency)}
            </div>
          </div>
        </div>

        {/* Buffer Status */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Buffer status</span>
            <span className={`font-medium ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
              {Math.round(bufferPercentage)}%
            </span>
          </div>
          <Progress 
            value={bufferPercentage} 
            className={`h-2 ${!isHealthy ? '[&>div]:bg-red-500' : ''}`}
          />
          <div className="text-[10px] text-muted-foreground">
            Minimum buffer: {formatCurrency(bufferThreshold, currency)}
          </div>
        </div>

        {/* Cash Flow */}
        <div className="flex gap-2">
          <div className="flex-1 p-2 rounded-md bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              Inkomend
            </div>
            <div className="text-sm font-medium text-green-600">
              +{formatCurrency(incomingTotal, currency)}
            </div>
          </div>
          <div className="flex-1 p-2 rounded-md bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-1 text-xs text-red-600">
              <TrendingDown className="h-3 w-3" />
              Uitgaand
            </div>
            <div className="text-sm font-medium text-red-600">
              -{formatCurrency(outgoingTotal, currency)}
            </div>
          </div>
        </div>

        {breachWarning && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-xs text-red-600">
              Waarschuwing: Deze actie zou de cash buffer doorbreken
            </span>
          </div>
        )}
      </div>
    </ActionCardWrapper>
  );
};
