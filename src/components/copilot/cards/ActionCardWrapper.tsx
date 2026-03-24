import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Lock, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GovernanceStatus {
  canExecute: boolean;
  requiresApproval: boolean;
  blockedReasons?: string[];
  permissions?: string[];
}

interface ActionCardWrapperProps {
  title: string;
  icon?: React.ReactNode;
  cardType: string;
  status?: 'preview' | 'pending' | 'approved' | 'executed' | 'blocked';
  governance?: GovernanceStatus;
  onExecute?: () => void;
  onRequestApproval?: () => void;
  onExplain?: () => void;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const ActionCardWrapper = React.forwardRef<HTMLDivElement, ActionCardWrapperProps>(
  ({
    title,
    icon,
    cardType,
    status = 'preview',
    governance,
    onExecute,
    onRequestApproval,
    onExplain,
    children,
    className,
    collapsible = false,
    defaultExpanded = true,
  }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

    const statusConfig = {
      preview: { label: 'Preview', variant: 'secondary' as const, icon: Info },
      pending: { label: 'Pending', variant: 'outline' as const, icon: AlertTriangle },
      approved: { label: 'Approved', variant: 'default' as const, icon: CheckCircle2 },
      executed: { label: 'Executed', variant: 'default' as const, icon: CheckCircle2 },
      blocked: { label: 'Blocked', variant: 'destructive' as const, icon: Lock },
    };

    const { label, variant, icon: StatusIcon } = statusConfig[status];

    // Default: can execute if no governance specified, or if governance allows it
    const canExecute = !governance || (governance.canExecute && !governance.requiresApproval);
    const needsApproval = governance?.requiresApproval ?? false;
    const isBlocked = governance?.blockedReasons && governance.blockedReasons.length > 0;

    return (
      <Card ref={ref} className={cn('border-border/50 bg-card/50 backdrop-blur-sm', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {cardType}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={variant} className="text-[10px] gap-1">
                <StatusIcon className="h-3 w-3" />
                {label}
              </Badge>
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <>
            <CardContent className="pt-0 pb-3">
              {children}

              {isBlocked && governance?.blockedReasons && (
                <div className="mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive text-xs font-medium mb-1">
                    <Lock className="h-3 w-3" />
                    Geblokkeerd
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {governance.blockedReasons.map((reason, i) => (
                      <li key={i}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-0 gap-2">
              {onExplain && (
                <Button variant="ghost" size="sm" onClick={onExplain} className="text-xs">
                  <Info className="h-3 w-3 mr-1" />
                  Uitleg
                </Button>
              )}
              <div className="flex-1" />
              {status === 'preview' && (
                <>
                  {isBlocked ? (
                    <Button variant="outline" size="sm" disabled className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Geblokkeerd
                    </Button>
                  ) : needsApproval ? (
                    <Button variant="outline" size="sm" onClick={onRequestApproval} className="text-xs">
                      Goedkeuring vragen
                    </Button>
                  ) : canExecute ? (
                    <Button size="sm" onClick={onExecute} className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Uitvoeren
                    </Button>
                  ) : null}
                </>
              )}
              {status === 'executed' && (
                <Badge variant="outline" className="text-green-600 border-green-600/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Uitgevoerd
                </Badge>
              )}
            </CardFooter>
          </>
        )}
      </Card>
    );
  }
);

ActionCardWrapper.displayName = 'ActionCardWrapper';
