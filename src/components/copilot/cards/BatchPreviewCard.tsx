import React from 'react';
import { ActionCardWrapper, GovernanceStatus } from './ActionCardWrapper';
import { Layers, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BatchItem {
  id: string;
  label: string;
  type: string;
  status: 'ready' | 'blocked' | 'warning';
  amount?: number;
  blockedReason?: string;
}

interface BatchPreviewCardProps {
  title: string;
  items: BatchItem[];
  totalAmount?: number;
  currency?: string;
  governance?: GovernanceStatus;
  onExecute?: () => void;
  onRequestApproval?: () => void;
  onExplain?: () => void;
}

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const BatchPreviewCard: React.FC<BatchPreviewCardProps> = ({
  title,
  items,
  totalAmount,
  currency = 'EUR',
  governance,
  onExecute,
  onRequestApproval,
  onExplain,
}) => {
  const readyCount = items.filter(i => i.status === 'ready').length;
  const blockedCount = items.filter(i => i.status === 'blocked').length;

  return (
    <ActionCardWrapper
      title={title}
      icon={<Layers className="h-4 w-4 text-purple-500" />}
      cardType="BATCH_PREVIEW"
      governance={governance}
      onExecute={onExecute}
      onRequestApproval={onRequestApproval}
      onExplain={onExplain}
    >
      <div className="space-y-3">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {items.length} items
            </Badge>
            {blockedCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {blockedCount} geblokkeerd
              </Badge>
            )}
          </div>
          {totalAmount !== undefined && (
            <div className="text-sm font-semibold">
              {formatCurrency(totalAmount, currency)}
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {items.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-2 p-2 rounded-md text-xs ${
                item.status === 'blocked' 
                  ? 'bg-red-500/10 border border-red-500/20' 
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.status === 'ready' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.label}</div>
                  {item.blockedReason && (
                    <div className="text-[10px] text-red-500 truncate">
                      {item.blockedReason}
                    </div>
                  )}
                </div>
              </div>
              {item.amount !== undefined && (
                <span className="shrink-0 font-medium">
                  {formatCurrency(item.amount, currency)}
                </span>
              )}
            </div>
          ))}
          {items.length > 8 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              +{items.length - 8} meer items
            </div>
          )}
        </div>

        {/* Ready Summary */}
        <div className="flex items-center justify-between pt-2 border-t text-xs">
          <span className="text-muted-foreground">Klaar om uit te voeren</span>
          <span className="font-medium text-green-600">{readyCount} van {items.length}</span>
        </div>
      </div>
    </ActionCardWrapper>
  );
};
