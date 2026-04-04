import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  Search,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  RefreshCw,
  ChevronRight,
  Target,
  Lightbulb,
  BarChart3,
  Users,
  Truck,
  MapPin,
  Mic,
} from 'lucide-react';
import { useAnomalyDetectionDB, Anomaly } from '@/hooks/useAnomalyDetectionDB';
import { useNaturalLanguageSearch, SearchResult } from '@/hooks/useNaturalLanguageSearch';
import { useLearningSystemDB } from '@/hooks/useLearningSystemDB';
import { usePredictiveDispatch } from '@/hooks/usePredictiveDispatch';
import { VoiceAssistant } from './VoiceAssistant';
import { cn } from '@/lib/utils';

// Severity styling - matching the hook's severity types
const severityConfig: Record<Anomaly['severity'], { bg: string; text: string; icon: React.ReactNode }> = {
  high: { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: <AlertTriangle className="w-4 h-4" /> },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: <AlertTriangle className="w-4 h-4" /> },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: <Eye className="w-4 h-4" /> },
};

// Anomaly Card Component
const AnomalyCard: React.FC<{
  anomaly: Anomaly;
  onDismiss: () => void;
}> = ({ anomaly, onDismiss }) => {
  const config = severityConfig[anomaly.severity];
  
  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all',
        config.bg
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-full', config.bg, config.text)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{anomaly.title}</h4>
            <Badge variant="outline" className={cn('text-xs', config.text)}>
              {anomaly.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(anomaly.detectedAt).toLocaleString('nl-NL', { 
              hour: '2-digit', 
              minute: '2-digit',
              day: 'numeric',
              month: 'short'
            })}
            {anomaly.deviation && (
              <>
                <span>•</span>
                <span className={anomaly.deviation.percentageOff > 0 ? 'text-red-500' : 'text-green-500'}>
                  {anomaly.deviation.percentageOff > 0 ? '+' : ''}{anomaly.deviation.percentageOff.toFixed(0)}%
                </span>
              </>
            )}
          </div>
          {anomaly.suggestedAction && (
            <p className="text-xs text-primary mt-2 font-medium">{anomaly.suggestedAction}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button size="sm" variant="ghost" onClick={onDismiss} className="h-7 text-xs text-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Opgelost
          </Button>
        </div>
      </div>
    </div>
  );
};

// Search Result Card
const SearchResultCard: React.FC<{ result: SearchResult }> = ({ result }) => {
  const typeIcons: Record<string, React.ReactNode> = {
    trip: <Truck className="w-4 h-4" />,
    driver: <Users className="w-4 h-4" />,
    customer: <Target className="w-4 h-4" />,
    invoice: <BarChart3 className="w-4 h-4" />,
    vehicle: <Truck className="w-4 h-4" />,
  };

  return (
    <div
      className="p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {typeIcons[result.type] || <MapPin className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{result.title}</h4>
          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${Math.min(100, result.relevanceScore)}%` }}
            />
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

// Main Intelligence Hub Component
export const IntelligenceHub: React.FC<{ companyId?: string }> = ({ companyId }) => {
  const [activeTab, setActiveTab] = useState('anomalies');
  const [searchQuery, setSearchQuery] = useState('');
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  
  // Hooks - using DB-backed versions
  const { 
    anomalies, 
    loading: anomalyLoading, 
    stats: anomalyStats,
    runFullScan: refreshAnomalies,
    dismissAnomaly,
    isScanning,
  } = useAnomalyDetectionDB();

  // Calculate severity counts from stats
  const highSeverityCount = anomalyStats.high;
  const mediumSeverityCount = anomalyStats.medium;
  
  const { 
    search, 
    results: searchResults, 
    loading: searchLoading,
    suggestions,
    parsedQuery,
    clearSearch,
    quickSearches,
    resultCount,
  } = useNaturalLanguageSearch();
  
  const { 
    stats: learningStats, 
    patterns,
  } = useLearningSystemDB();
  
  const { 
    predictions, 
    isAnalyzing: dispatchLoading,
    analyzeBatch,
  } = usePredictiveDispatch();

  // Handle search
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await search(searchQuery);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Calculate anomaly stats
  const lowSeverityCount = anomalies.filter(a => a.severity === 'low').length;

  return (
    <>
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Intelligence Hub</CardTitle>
              <CardDescription>AI-gestuurde inzichten & analyses</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowVoiceAssistant(true)}
              className="gap-1.5"
            >
              <Mic className="w-3.5 h-3.5" />
              AI Assistent
            </Button>
            {highSeverityCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {highSeverityCount} hoog
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {learningStats.patternsFound} patronen
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="px-6">
            <TabsList className="w-full grid grid-cols-4 h-10">
              <TabsTrigger value="anomalies" className="gap-1.5 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                Anomalieën
                {anomalies.length > 0 && (
                  <Badge variant="destructive" className="h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                    {anomalies.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-1.5 text-xs">
                <Search className="w-3.5 h-3.5" />
                NL Zoeken
              </TabsTrigger>
              <TabsTrigger value="dispatch" className="gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5" />
                Smart Dispatch
              </TabsTrigger>
              <TabsTrigger value="learning" className="gap-1.5 text-xs">
                <Lightbulb className="w-3.5 h-3.5" />
                Learning
              </TabsTrigger>
            </TabsList>
          </div>

          <Separator className="mt-4" />

          <div className="p-6 pt-4">
            {/* Anomalies Tab */}
            <TabsContent value="anomalies" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <div className={cn('p-2 rounded-lg text-center', severityConfig.high.bg)}>
                    <div className={cn('text-lg font-bold', severityConfig.high.text)}>
                      {highSeverityCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Hoog</div>
                  </div>
                  <div className={cn('p-2 rounded-lg text-center', severityConfig.medium.bg)}>
                    <div className={cn('text-lg font-bold', severityConfig.medium.text)}>
                      {mediumSeverityCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Medium</div>
                  </div>
                  <div className={cn('p-2 rounded-lg text-center', severityConfig.low.bg)}>
                    <div className={cn('text-lg font-bold', severityConfig.low.text)}>
                      {lowSeverityCount}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Laag</div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={refreshAnomalies}
                  disabled={anomalyLoading || isScanning}
                  className="ml-4"
                >
                  <RefreshCw className={cn('w-4 h-4 mr-2', (anomalyLoading || isScanning) && 'animate-spin')} />
                  Scan
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                  {anomalies.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center h-[200px] text-muted-foreground"
                    >
                      <CheckCircle className="w-10 h-10 mb-3 text-green-500" />
                      <p className="font-medium">Geen anomalieën gedetecteerd</p>
                      <p className="text-sm">Alle systemen opereren normaal</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {anomalies.map(anomaly => (
                        <AnomalyCard
                          key={anomaly.id}
                          anomaly={anomaly}
                          onDismiss={() => dismissAnomaly(anomaly.id)}
                        />
                      ))}
                    </div>
                  )}
              </ScrollArea>
            </TabsContent>

            {/* Natural Language Search Tab */}
            <TabsContent value="search" className="m-0 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Zoek in natuurlijke taal... bijv. 'ritten naar amsterdam morgen'"
                  className="pl-10 pr-20"
                />
                <Button 
                  size="sm" 
                  onClick={handleSearch}
                  disabled={searchLoading}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                >
                  {searchLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Zoeken'
                  )}
                </Button>
              </div>

              {parsedQuery && (
                <div className="flex flex-wrap gap-2">
                  {parsedQuery.locations?.map(loc => (
                    <Badge key={loc} variant="secondary" className="gap-1">
                      <MapPin className="w-3 h-3" />
                      {loc}
                    </Badge>
                  ))}
                  {parsedQuery.dateRange && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="w-3 h-3" />
                      {parsedQuery.dateRange.start.toLocaleDateString('nl-NL')}
                    </Badge>
                  )}
                  {parsedQuery.status?.map(s => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              {resultCount > 0 && (
                <p className="text-sm text-muted-foreground">{resultCount} resultaten gevonden</p>
              )}

              <ScrollArea className="h-[250px]">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(result => (
                      <SearchResultCard key={result.id} result={result} />
                    ))}
                  </div>
                ) : !searchLoading && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Probeer een van deze zoekopdrachten:</p>
                    {quickSearches.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSearchQuery(sug.query);
                          search(sug.query);
                        }}
                        className="w-full p-3 rounded-lg border text-left hover:bg-accent/50 transition-colors"
                      >
                        <p className="font-medium text-sm">{sug.label}</p>
                        <p className="text-xs text-muted-foreground">{sug.query}</p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Smart Dispatch Tab */}
            <TabsContent value="dispatch" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <div className="p-3 rounded-lg bg-green-500/10 text-center">
                    <div className="text-lg font-bold text-green-600">
                      {predictions.filter(p => p.topPick && p.topPick.confidence >= 80).length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Hoog vertrouwen</div>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {predictions.filter(p => p.topPick && p.topPick.confidence >= 50 && p.topPick.confidence < 80).length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Gemiddeld</div>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {predictions.filter(p => !p.topPick || p.topPick.confidence < 50).length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Review nodig</div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => companyId && analyzeBatch(companyId)}
                  disabled={dispatchLoading || !companyId}
                  className="ml-4"
                >
                  <Zap className={cn('w-4 h-4 mr-2', dispatchLoading && 'animate-pulse')} />
                  Analyseer
                </Button>
              </div>

              <ScrollArea className="h-[280px]">
                {predictions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <Truck className="w-10 h-10 mb-3" />
                    <p className="font-medium">Geen openstaande voorspellingen</p>
                    <p className="text-sm">Klik op Analyseer om te starten</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {predictions.map(pred => (
                      <div key={pred.tripId} className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-sm">
                              {pred.pickupCity} → {pred.deliveryCity}
                            </h4>
                            <p className="text-xs text-muted-foreground">{pred.pickupDate}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">{pred.autoAssignConfidence}%</div>
                            <div className="text-[10px] text-muted-foreground">vertrouwen</div>
                          </div>
                        </div>
                        
                        {pred.topPick && (
                          <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-sm">{pred.topPick.driverName}</span>
                              </div>
                              <Badge variant="outline" className="text-green-600">
                                {pred.topPick.confidence}%
                              </Badge>
                            </div>
                            {pred.topPick.recommendations.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {pred.topPick.recommendations[0]}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Learning Tab */}
            <TabsContent value="learning" className="m-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border">
                  <div className="text-2xl font-bold">{learningStats.totalEvents}</div>
                  <div className="text-sm text-muted-foreground">Beslissingen geleerd</div>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="text-2xl font-bold">{learningStats.patternsFound}</div>
                  <div className="text-sm text-muted-foreground">Patronen ontdekt</div>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="text-2xl font-bold">{learningStats.avgConfidence}%</div>
                  <div className="text-sm text-muted-foreground">Gem. zekerheid</div>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="text-2xl font-bold">{learningStats.avgSuccessRate}%</div>
                  <div className="text-sm text-muted-foreground">Succesrate</div>
                </div>
              </div>

              <ScrollArea className="h-[200px]">
                {patterns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
                    <Lightbulb className="w-10 h-10 mb-3" />
                    <p className="font-medium">Nog geen patronen geleerd</p>
                    <p className="text-sm">Het systeem leert van je beslissingen</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patterns.map(pattern => (
                      <div key={pattern.id} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{pattern.pattern_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {pattern.occurrences}x gezien
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all" 
                              style={{ width: `${pattern.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {Math.round(pattern.confidence * 100)}%
                          </span>
                        </div>
                      </div>
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

export default IntelligenceHub;
