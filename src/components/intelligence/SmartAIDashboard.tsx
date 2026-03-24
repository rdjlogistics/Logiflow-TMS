import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Zap,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  Clock,
  Target,
  Truck,
  Euro,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Mic,
  Sparkles,
  Activity,
  Shield,
  TrendingDown,
} from 'lucide-react';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';
import { useProactiveAlerts } from '@/hooks/useProactiveAlerts';
import { useContextualSuggestions, ContextType } from '@/hooks/useContextualSuggestions';
import { VoiceAssistant } from './VoiceAssistant';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

// Priority colors
const priorityConfig = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
};

const impactConfig = {
  high: { bg: 'bg-red-500/10', text: 'text-red-500' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
  low: { bg: 'bg-green-500/10', text: 'text-green-500' },
};

const predictionTypeIcons: Record<string, React.ReactNode> = {
  delay_risk: <Clock className="w-4 h-4" />,
  demand_prediction: <TrendingUp className="w-4 h-4" />,
  cost_forecast: <Euro className="w-4 h-4" />,
  driver_fatigue: <Users className="w-4 h-4" />,
  peak_period: <Zap className="w-4 h-4" />,
  maintenance_due: <Truck className="w-4 h-4" />,
};

interface SmartAIDashboardProps {
  companyId?: string;
  currentContext?: {
    type: ContextType;
    data: Record<string, any>;
  };
}

export const SmartAIDashboard: React.FC<SmartAIDashboardProps> = ({ 
  companyId,
  currentContext,
}) => {
  const [activeTab, setActiveTab] = useState('predictions');
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);

  // Hooks
  const {
    predictions,
    loading: predictionsLoading,
    refresh: refreshPredictions,
    highConfidencePredictions,
    delayPredictions,
    demandPredictions,
    costForecasts,
    lastUpdated,
  } = usePredictiveAnalytics();

  const {
    activeAlerts,
    criticalAlerts,
    warningAlerts,
    isLoading: alertsLoading,
    fetchAlerts,
    dismissAlert,
    resolveAlert,
    actionRequiredCount,
  } = useProactiveAlerts();

  const {
    suggestions,
    loading: suggestionsLoading,
    getSuggestions,
    dismissSuggestion,
  } = useContextualSuggestions();

  // Fetch contextual suggestions when context changes
  useEffect(() => {
    if (currentContext) {
      getSuggestions(currentContext);
    }
  }, [currentContext, getSuggestions]);

  // Summary stats with memoization
  const stats = useMemo(() => ({
    totalPredictions: predictions.length,
    highConfidence: highConfidencePredictions.length,
    criticalAlerts: criticalAlerts.length,
    totalAlerts: activeAlerts.length,
    suggestions: suggestions.length,
    riskCount: predictions.filter(p => p.type === 'driver_fatigue' || p.type === 'maintenance_due').length,
  }), [predictions, highConfidencePredictions, criticalAlerts, activeAlerts, suggestions]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 2, repeat: Infinity },
    },
  };

  // Loading skeleton
  const PredictionSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-lg border">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1 w-full mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/10">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Smart AI Dashboard</CardTitle>
                <CardDescription>Predictieve analyses & proactieve monitoring</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowVoiceAssistant(true)}
                      className="gap-1.5 relative overflow-hidden group"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100"
                        initial={false}
                        animate={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                      <Mic className="w-3.5 h-3.5 relative z-10" />
                      <span className="relative z-10">Assistent</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>AI Voice Assistent</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <AnimatePresence mode="wait">
                {stats.criticalAlerts > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    variants={pulseVariants}
                  >
                    <Badge variant="destructive" className="animate-pulse gap-1">
                      <Activity className="w-3 h-3" />
                      {stats.criticalAlerts} kritiek
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {lastUpdated && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="w-3 h-3" />
                        {stats.highConfidence}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Laatste update: {format(lastUpdated, 'HH:mm', { locale: nl })}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6">
              <TabsList className="w-full grid grid-cols-3 h-10">
                <TabsTrigger value="predictions" className="gap-1.5 text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Voorspellingen
                  {stats.highConfidence > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {stats.highConfidence}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="alerts" className="gap-1.5 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Proactief
                  {stats.criticalAlerts > 0 && (
                    <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                      {stats.criticalAlerts}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="suggestions" className="gap-1.5 text-xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Suggesties
                  {stats.suggestions > 0 && (
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      {stats.suggestions}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <Separator className="mt-4" />

            <div className="p-6 pt-4">
              {/* Predictions Tab */}
              <TabsContent value="predictions" className="m-0 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <motion.div 
                    className="grid grid-cols-4 gap-2 flex-1"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {[
                      { value: delayPredictions.length, label: 'Vertragingen', color: 'primary', icon: Clock },
                      { value: demandPredictions.length, label: 'Vraag', color: 'blue-500', icon: TrendingUp },
                      { value: costForecasts.length, label: 'Kosten', color: 'green-500', icon: Euro },
                      { value: stats.riskCount, label: 'Risico\'s', color: 'purple-500', icon: Shield },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        variants={itemVariants}
                        className={cn(
                          'p-2 rounded-lg text-center cursor-pointer transition-all hover:scale-105',
                          `bg-${stat.color}/5 hover:bg-${stat.color}/10`
                        )}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <motion.div 
                          className={cn('text-lg font-bold', `text-${stat.color}`)}
                          key={stat.value}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                        >
                          {stat.value}
                        </motion.div>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                          <stat.icon className="w-2.5 h-2.5" />
                          {stat.label}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={refreshPredictions}
                          disabled={predictionsLoading}
                          className="ml-4"
                        >
                          <RefreshCw className={cn('w-4 h-4', predictionsLoading && 'animate-spin')} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Vernieuwen</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <ScrollArea className="h-[300px]">
                  {predictionsLoading && predictions.length === 0 ? (
                    <PredictionSkeleton />
                  ) : predictions.length === 0 ? (
                    <motion.div 
                      className="flex flex-col items-center justify-center h-[200px] text-muted-foreground"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <TrendingUp className="w-10 h-10 mb-3" />
                      </motion.div>
                      <p className="font-medium">Geen voorspellingen</p>
                      <p className="text-sm">Meer data nodig voor analyse</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="space-y-3"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {predictions.slice(0, 10).map((prediction, index) => (
                        <motion.div
                          key={prediction.id}
                          variants={itemVariants}
                          layout
                          className={cn(
                            'p-4 rounded-lg border transition-all hover:shadow-md',
                            prediction.confidence >= 80 && 'border-l-2 border-l-primary'
                          )}
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex items-start gap-3">
                            <motion.div 
                              className={cn(
                                'p-2 rounded-lg',
                                prediction.impact?.type === 'negative' 
                                  ? 'bg-red-500/10 text-red-500'
                                  : prediction.impact?.type === 'positive'
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-muted text-muted-foreground'
                              )}
                              whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                              {predictionTypeIcons[prediction.type] || <Target className="w-4 h-4" />}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm truncate">{prediction.title}</h4>
                                <Badge 
                                  variant={prediction.confidence >= 80 ? 'default' : 'outline'} 
                                  className={cn(
                                    'text-[10px]',
                                    prediction.confidence >= 80 && 'bg-primary/10 text-primary'
                                  )}
                                >
                                  {prediction.confidence}% zeker
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{prediction.description}</p>
                              {prediction.recommendation && (
                                <motion.p 
                                  className="text-xs text-primary font-medium flex items-center gap-1"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <Lightbulb className="w-3 h-3" />
                                  {prediction.recommendation}
                                </motion.p>
                              )}
                              <div className="mt-2">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 0.5, delay: index * 0.1 }}
                                >
                                  <Progress 
                                    value={prediction.confidence} 
                                    className={cn(
                                      'h-1',
                                      prediction.confidence >= 80 && '[&>div]:bg-primary'
                                    )} 
                                  />
                                </motion.div>
                              </div>
                            </div>
                            {prediction.impact?.type === 'negative' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-red-500"
                              >
                                <TrendingDown className="w-4 h-4" />
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Proactive Alerts Tab */}
              <TabsContent value="alerts" className="m-0 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    <div className={cn('p-2 rounded-lg text-center', priorityConfig.critical.bg)}>
                      <div className={cn('text-lg font-bold', priorityConfig.critical.text)}>
                        {criticalAlerts.length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Kritiek</div>
                    </div>
                    <div className={cn('p-2 rounded-lg text-center', priorityConfig.high.bg)}>
                      <div className={cn('text-lg font-bold', priorityConfig.high.text)}>
                        {warningAlerts.length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Hoog</div>
                    </div>
                    <div className={cn('p-2 rounded-lg text-center', priorityConfig.medium.bg)}>
                      <div className={cn('text-lg font-bold', priorityConfig.medium.text)}>
                        {activeAlerts.filter(a => a.severity === 'info').length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Info</div>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/5 text-center">
                      <div className="text-lg font-bold text-primary">{actionRequiredCount}</div>
                      <div className="text-[10px] text-muted-foreground">Actie nodig</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchAlerts}
                    disabled={alertsLoading}
                    className="ml-4"
                  >
                    <RefreshCw className={cn('w-4 h-4', alertsLoading && 'animate-spin')} />
                  </Button>
                </div>

                <ScrollArea className="h-[300px]">
                  {activeAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <CheckCircle className="w-10 h-10 mb-3 text-green-500" />
                      <p className="font-medium">Alles onder controle</p>
                      <p className="text-sm">Geen proactieve alerts</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeAlerts.map(alert => {
                        const config = priorityConfig[alert.severity] || priorityConfig.low;
                        return (
                          <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn('p-4 rounded-lg border', config.border)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn('p-2 rounded-lg', config.bg, config.text)}>
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm">{alert.title}</h4>
                                  <Badge variant="outline" className={cn('text-[10px]', config.text)}>
                                    {alert.severity}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>
                                {alert.suggestedActions.length > 0 && (
                                  <div className="flex gap-2 mt-2">
                                    {alert.suggestedActions.slice(0, 2).map((action, i) => (
                                      <Button
                                        key={i}
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-xs"
                                        onClick={() => resolveAlert(alert.id)}
                                      >
                                        {action.label}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => dismissAlert(alert.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Contextual Suggestions Tab */}
              <TabsContent value="suggestions" className="m-0 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {currentContext 
                      ? `Context: ${currentContext.type.replace('_', ' ')}`
                      : 'Navigeer naar een pagina voor contextuele suggesties'
                    }
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => currentContext && getSuggestions(currentContext)}
                    disabled={suggestionsLoading || !currentContext}
                  >
                    <RefreshCw className={cn('w-4 h-4', suggestionsLoading && 'animate-spin')} />
                  </Button>
                </div>

                <ScrollArea className="h-[300px]">
                  {suggestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <Lightbulb className="w-10 h-10 mb-3" />
                      <p className="font-medium">Geen suggesties</p>
                      <p className="text-sm text-center">
                        Open een order, klant of planning voor slimme suggesties
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {suggestions.map(suggestion => (
                        <motion.div
                          key={suggestion.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'p-2 rounded-lg',
                              suggestion.type === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                              suggestion.type === 'action' ? 'bg-primary/10 text-primary' :
                              suggestion.type === 'optimization' ? 'bg-green-500/10 text-green-500' :
                              'bg-blue-500/10 text-blue-500'
                            )}>
                              {suggestion.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                               suggestion.type === 'action' ? <Zap className="w-4 h-4" /> :
                               <Lightbulb className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{suggestion.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                              {suggestion.actionable && suggestion.actionLabel && (
                                <Button size="sm" className="mt-2 h-7 text-xs">
                                  {suggestion.actionLabel}
                                  <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => dismissSuggestion(suggestion.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Voice Assistant */}
      <VoiceAssistant
        isOpen={showVoiceAssistant}
        onClose={() => setShowVoiceAssistant(false)}
      />
    </>
  );
};

export default SmartAIDashboard;
