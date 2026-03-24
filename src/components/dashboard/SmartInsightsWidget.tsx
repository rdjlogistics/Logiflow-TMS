import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSmartInsights, SmartInsight } from '@/hooks/useSmartInsights';
import { 
  Brain, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  CreditCard, 
  Route, 
  Lightbulb,
  X,
  ArrowRight,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple div wrapper - no ref forwarding needed
const InsightCardWrapper = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement> & { className?: string }) => (
  <div className={className} {...props} />
);

const MotionInsightCard = motion.create(InsightCardWrapper);

const getInsightIcon = (type: SmartInsight['type']) => {
  switch (type) {
    case 'margin_alert': return TrendingDown;
    case 'driver_match': return Users;
    case 'payment_risk': return CreditCard;
    case 'capacity_warning': return AlertTriangle;
    case 'route_optimization': return Route;
    case 'efficiency_tip':
    case 'cost_saving': return Lightbulb;
    default: return Brain;
  }
};

const getSeverityConfig = (severity: SmartInsight['severity']) => {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-destructive/10',
        border: 'border-destructive/25',
        text: 'text-destructive',
      };
    case 'warning':
      return {
        bg: 'bg-warning/10',
        border: 'border-warning/25',
        text: 'text-warning',
      };
    case 'info':
      return {
        bg: 'bg-primary/10',
        border: 'border-primary/25',
        text: 'text-primary',
      };
    default:
      return {
        bg: 'bg-muted/30',
        border: 'border-border/30',
        text: 'text-muted-foreground',
      };
  }
};

export function SmartInsightsWidget() {
  const { insights, loading, refresh, dismissInsight, criticalCount, warningCount } = useSmartInsights();

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      x: 12,
      transition: { duration: 0.15 }
    }
  };

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2.5 rounded-xl bg-primary/15"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </motion.div>
            <div>
              <CardTitle className="text-lg font-bold">AI Insights</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Analyseren...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2.5 rounded-xl bg-success/15"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <CheckCircle2 className="h-5 w-5 text-success" />
            </motion.div>
            <div>
              <CardTitle className="text-lg font-bold">AI Insights</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Geen waarschuwingen</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <motion.div 
            className="flex flex-col items-center justify-center py-6 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div 
              className="relative mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="absolute inset-0 bg-success/20 rounded-full blur-xl" />
              <div className="relative p-4 rounded-full bg-success/10 border border-success/20">
                <Brain className="h-8 w-8 text-success" />
              </div>
            </motion.div>
            <p className="font-semibold">Alles onder controle</p>
            <p className="text-xs text-muted-foreground mt-1">
              Geen actieve waarschuwingen of suggesties
            </p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
      
      <CardHeader className="pb-4 border-b border-border/30 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2.5 rounded-xl bg-primary/15"
              whileHover={{ rotate: 20, scale: 1.05 }}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">AI Insights</CardTitle>
                {(criticalCount > 0 || warningCount > 0) && (
                  <div className="flex items-center gap-1">
                    {criticalCount > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                        {criticalCount}
                      </Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge variant="warning" className="h-5 px-1.5 text-[10px] font-bold">
                        {warningCount}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {insights.length} {insights.length === 1 ? 'inzicht' : 'inzichten'}
              </p>
            </div>
          </div>
          <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
            <Button variant="ghost" size="sm" onClick={refresh} className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        <ScrollArea className="h-[240px] sm:h-[280px]">
          <motion.div 
            className="p-3 sm:p-4 space-y-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {insights.slice(0, 6).map((insight) => {
                const Icon = getInsightIcon(insight.type);
                const config = getSeverityConfig(insight.severity);
                
                  return (
                    <MotionInsightCard
                      key={insight.id}
                      variants={itemVariants}
                      exit="exit"
                      layout
                      className={cn(
                        "relative p-3 sm:p-3.5 rounded-xl border transition-all touch-manipulation",
                        config.bg,
                        config.border,
                        "hover:shadow-sm active:scale-[0.98]"
                      )}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Dismiss button - larger touch target for iOS */}
                      <motion.div 
                        whileTap={{ scale: 0.9 }}
                        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 sm:h-6 sm:w-6 p-0 opacity-60 sm:opacity-40 hover:opacity-100 touch-manipulation"
                          onClick={() => dismissInsight(insight.id)}
                        >
                          <X className="h-4 w-4 sm:h-3 sm:w-3" />
                        </Button>
                      </motion.div>
                      
                      <div className="flex items-start gap-2.5 sm:gap-3 pr-8 sm:pr-6">
                        <div className={cn(
                          "p-1.5 sm:p-2 rounded-lg shrink-0",
                          config.bg
                        )}>
                          <Icon className={cn("h-3.5 sm:h-4 w-3.5 sm:w-4", config.text)} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-semibold text-xs sm:text-sm leading-tight", config.text)}>
                            {insight.title}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
                            {insight.description}
                          </p>
                          
                          {insight.impact && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <Badge variant="outline" className="h-5 text-[9px] sm:text-[10px] px-1.5 font-medium">
                                {insight.impact.type === 'revenue' && '💰'}
                                {insight.impact.type === 'cost' && '💸'}
                                {insight.impact.type === 'time' && '⏱️'}
                                {insight.impact.type === 'risk' && '⚠️'}
                                {' '}
                                {insight.impact.type === 'revenue' || insight.impact.type === 'cost' 
                                  ? `€${insight.impact.value.toLocaleString('nl-NL')}`
                                  : insight.impact.value
                                } {insight.impact.unit}
                              </Badge>
                            </div>
                          )}
                          
                          {insight.action && (
                            <Button
                              asChild
                              variant="link"
                              size="sm"
                              className="h-auto p-0 mt-2 text-xs group touch-manipulation"
                            >
                              <Link to={insight.action.href}>
                                {insight.action.label}
                                <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </MotionInsightCard>
                  );
              })}
            </AnimatePresence>
          </motion.div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}