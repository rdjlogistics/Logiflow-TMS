import React from 'react';
import { ActionCardWrapper } from './ActionCardWrapper';
import { Stethoscope, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DiagnosisStep {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  detail?: string;
}

interface FixAction {
  id: string;
  label: string;
  description: string;
  actionType: 'quick_fix' | 'requires_approval' | 'manual';
}

interface DiagnosisCardProps {
  title: string;
  entityType: string;
  entityId: string;
  steps: DiagnosisStep[];
  fixActions?: FixAction[];
  onApplyFix?: (actionId: string) => void;
}

const statusIcons = {
  pass: CheckCircle2,
  fail: XCircle,
  warning: AlertTriangle,
  pending: AlertTriangle,
};

const statusColors = {
  pass: 'text-green-500',
  fail: 'text-red-500',
  warning: 'text-yellow-500',
  pending: 'text-muted-foreground',
};

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({
  title,
  entityType,
  entityId,
  steps,
  fixActions,
  onApplyFix,
}) => {
  const hasFailures = steps.some(s => s.status === 'fail');
  const hasWarnings = steps.some(s => s.status === 'warning');

  return (
    <ActionCardWrapper
      title={title}
      icon={<Stethoscope className="h-4 w-4 text-blue-500" />}
      cardType="DIAGNOSIS"
      status={hasFailures ? 'blocked' : hasWarnings ? 'preview' : 'executed'}
    >
      <div className="space-y-3">
        {/* Entity Reference */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">{entityType}</Badge>
          <span className="font-mono">{entityId}</span>
        </div>

        {/* Diagnosis Steps */}
        <div className="space-y-1.5">
          {steps.map((step) => {
            const Icon = statusIcons[step.status];
            return (
              <div key={step.id} className="flex items-start gap-2">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${statusColors[step.status]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{step.label}</div>
                  {step.detail && (
                    <div className="text-[10px] text-muted-foreground">{step.detail}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fix Actions */}
        {fixActions && fixActions.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground">Oplossingen</div>
            {fixActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium">{action.label}</div>
                  <div className="text-[10px] text-muted-foreground">{action.description}</div>
                </div>
                <Button
                  size="sm"
                  variant={action.actionType === 'quick_fix' ? 'default' : 'outline'}
                  className="shrink-0 text-xs h-7"
                  onClick={() => onApplyFix?.(action.id)}
                >
                  {action.actionType === 'requires_approval' ? 'Vraag aan' : 'Toepassen'}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ActionCardWrapper>
  );
};
