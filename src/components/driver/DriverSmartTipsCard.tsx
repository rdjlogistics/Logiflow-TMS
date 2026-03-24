import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDriverSmartTips, DriverTip } from '@/hooks/useDriverSmartTips';
import { 
  Coffee, 
  Clock, 
  Fuel, 
  Map, 
  TrendingUp, 
  Moon, 
  Timer, 
  CheckCircle,
  AlertTriangle,
  X,
  Sparkles,
} from 'lucide-react';

const getTipIcon = (type: DriverTip['type']) => {
  switch (type) {
    case 'break_reminder':
      return Coffee;
    case 'fuel_tip':
      return Fuel;
    case 'route_tip':
      return Map;
    case 'efficiency':
      return Clock;
    case 'earnings':
      return TrendingUp;
    case 'safety':
      return type === 'safety' ? Moon : CheckCircle;
    default:
      return AlertTriangle;
  }
};

const getPriorityStyles = (priority: DriverTip['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-destructive/10 border-destructive/30 text-destructive';
    case 'medium':
      return 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400';
    case 'low':
      return 'bg-primary/5 border-primary/20 text-foreground';
    default:
      return 'bg-muted border-border';
  }
};

interface DriverSmartTipsCardProps {
  className?: string;
}

export function DriverSmartTipsCard({ className }: DriverSmartTipsCardProps) {
  const { tips, stats, loading, dismissTip, highPriorityCount } = useDriverSmartTips();

  if (loading) {
    return (
      <Card className={`border-border/40 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Tips laden...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tips.length === 0) {
    return (
      <Card className={`border-border/40 bg-green-500/5 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Alles op orde</p>
              <p className="text-xs text-muted-foreground">Geen tips of waarschuwingen</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Slimme tips</span>
          {highPriorityCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
              {highPriorityCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-2">
        {tips.slice(0, 3).map((tip) => {
          const Icon = getTipIcon(tip.type);
          return (
            <Card 
              key={tip.id} 
              className={`border ${getPriorityStyles(tip.priority)} transition-all`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{tip.title}</p>
                    <p className="text-xs opacity-80 mt-0.5">{tip.message}</p>
                    
                    {tip.action && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-2 text-xs"
                        onClick={tip.action.callback}
                      >
                        {tip.action.label}
                      </Button>
                    )}
                  </div>
                  
                  {tip.dismissible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                      onClick={() => dismissTip(tip.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats summary */}
      {stats.stopsRemaining > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-xs">
          <span className="text-muted-foreground">Nog {stats.stopsRemaining} stops</span>
          {stats.estimatedEndTime && (
            <span className="font-medium">
              Klaar ±{new Date(stats.estimatedEndTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
