import React, { useState, useEffect } from 'react';
import type { TripStatus } from "@/types/supabase-helpers";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Brain,
  Sparkles,
  User,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  Send,
  Bot,
  Star,
  MapPin,
  TrendingUp,
  Shield,
  ChevronRight,
  Users,
  Loader2,
} from 'lucide-react';
import { useAIAutoDispatch, type ScoredDriver } from '@/hooks/useAIAutoDispatch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Deduplicate city names that may be stored doubled (e.g. "AmsterdamAmsterdam" → "Amsterdam")
function dedupCity(s: string | null | undefined): string {
  if (!s) return '—';
  const trimmed = s.trim();
  if (trimmed.length === 0) return '—';
  if (trimmed.length % 2 === 0) {
    const half = trimmed.length / 2;
    if (trimmed.slice(0, half) === trimmed.slice(half)) {
      return trimmed.slice(0, half);
    }
  }
  return trimmed;
}

interface AIAutoDispatchPanelProps {
  tripId?: string;
  onAssigned?: () => void;
}

export function AIAutoDispatchPanel({ tripId, onAssigned }: AIAutoDispatchPanelProps) {
  const {
    isAnalyzing,
    candidates,
    aiAnalysis,
    activeConversations,
    messages,
    analyzeTrip,
    initiateDispatch,
    processResponse,
    confirmAssignment,
    fetchMessages,
  } = useAIAutoDispatch();

  const { toast } = useToast();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(tripId || null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{ tripId: string; pickup: string; delivery: string; driverName: string; score: number }> | null>(null);

  // Fetch unassigned trips with order_number
  const { data: unassignedTrips, refetch: refetchTrips } = useQuery({
    queryKey: ['unassigned-trips-dispatch'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, order_number, pickup_city, delivery_city, trip_date, cargo_description')
        .is('driver_id', null)
        .gte('trip_date', new Date().toISOString().split('T')[0])
        .order('trip_date', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Analyze when trip is selected
  useEffect(() => {
    if (selectedTripId) {
      analyzeTrip(selectedTripId);
      setShowAnalysis(true);
    }
  }, [selectedTripId, analyzeTrip]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation, fetchMessages]);

  const handleInitiateDispatch = async (driver: ScoredDriver) => {
    if (!selectedTripId) return;
    
    const result = await initiateDispatch(selectedTripId, driver.driver.id);
    if (result) {
      setSelectedConversation(result.conversationId);
    }
  };

  const handleConfirmAssign = async () => {
    if (!selectedConversation) return;
    
    await confirmAssignment(selectedConversation);
    onAssigned?.();
  };

  const handleBatchAssign = async () => {
    if (!unassignedTrips || unassignedTrips.length === 0) return;
    
    setIsBatchProcessing(true);
    setBatchResults(null);
    const results: Array<{ tripId: string; pickup: string; delivery: string; driverName: string; score: number }> = [];

    try {
      for (const trip of unassignedTrips.slice(0, 10)) {
        const data = await analyzeTrip(trip.id);
        if (data?.candidates?.length > 0) {
          const top = data.candidates[0];
          results.push({
            tripId: trip.id,
            pickup: dedupCity(trip.pickup_city),
            delivery: dedupCity(trip.delivery_city),
            driverName: top.driver.name,
            score: top.overallScore,
          });
        }
      }
      setBatchResults(results);
      toast({
        title: `🤖 ${results.length} ritten geanalyseerd`,
        description: 'Bekijk de suggesties hieronder en bevestig.',
      });
    } catch (err) {
      toast({ title: 'Batch analyse mislukt', variant: 'destructive' });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleConfirmBatch = async () => {
    if (!batchResults) return;
    let successCount = 0;
    
    for (const result of batchResults) {
      try {
        // Find the driver_id from analysis candidates for this trip
        const analysisData = await analyzeTrip(result.tripId);
        const topDriver = analysisData?.candidates?.[0];
        if (!topDriver) continue;
        
        const { error } = await supabase
          .from('trips')
          .update({ 
            driver_id: topDriver.driver.id,
            status: 'gepland' satisfies TripStatus,
          })
          .eq('id', result.tripId);
        if (!error) successCount++;
      } catch (e) { console.error('Trip update failed:', e); }
    }
    
    toast({
      title: `✅ ${successCount}/${batchResults.length} ritten verwerkt`,
      description: 'De chauffeurs zijn genotificeerd.',
    });
    setBatchResults(null);
    refetchTrips();
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getRecommendationBadge = (rec: ScoredDriver['recommendation']) => {
    switch (rec) {
      case 'highly_recommended':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🌟 Top Keuze</Badge>;
      case 'recommended':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">✓ Aanbevolen</Badge>;
      case 'acceptable':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">○ Acceptabel</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">✗ Niet Aanbevolen</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Left: Trip Selection & AI Analysis */}
      <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Auto-Dispatch Engine
            <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/30">
              <Sparkles className="h-3 w-3 mr-1" />
              Gemini AI
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Batch Results Preview */}
          {batchResults && (
            <div
              className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-green-500/10 border border-primary/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  AI Suggesties — {batchResults.length} ritten
                </h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setBatchResults(null)}>
                    Annuleer
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleConfirmBatch}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Bevestig Alle
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {batchResults.map((r, i) => (
                  <div key={r.tripId} className="flex items-center justify-between text-sm p-2 rounded-lg bg-background/50">
                    <span className="text-muted-foreground">{r.pickup} → {r.delivery}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{r.driverName}</span>
                      <Badge variant="secondary" className="text-[10px]">{r.score}%</Badge>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trip Selector */}
          {!showAnalysis && !batchResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Selecteer een rit om te analyseren</h4>
                {unassignedTrips && unassignedTrips.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBatchAssign}
                    disabled={isBatchProcessing}
                    className="text-xs border-primary/50 text-primary hover:bg-primary/10"
                  >
                    {isBatchProcessing ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3 mr-1" />
                    )}
                    AI: Wijs alle open ritten toe
                  </Button>
                )}
              </div>
              <div className="grid gap-2">
                {unassignedTrips?.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {trip.order_number && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {trip.order_number}
                            </Badge>
                          )}
                          <p className="font-medium text-sm">
                            {dedupCity(trip.pickup_city)} → {dedupCity(trip.delivery_city)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(trip.trip_date).toLocaleDateString('nl-NL', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                {(!unassignedTrips || unassignedTrips.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>Alle ritten zijn toegewezen!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Analysis Results */}
            {showAnalysis && (
              <div
                className="space-y-4"
              >
                {/* Back button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAnalysis(false);
                    setSelectedTripId(null);
                  }}
                  className="mb-2"
                >
                  ← Terug naar ritten
                </Button>

                {/* Loading state */}
                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div
                    >
                      <Brain className="h-12 w-12 text-primary" />
                    </div>
                    <p className="text-muted-foreground">AI analyseert chauffeurs...</p>
                    <Progress value={65} className="w-48" />
                  </div>
                )}

                {/* AI Analysis Summary */}
                {!isAnalyzing && aiAnalysis && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">AI Aanbeveling</h4>
                          <Badge className={cn(
                            "text-xs",
                            aiAnalysis.confidence >= 90 ? "bg-green-500/20 text-green-400" :
                            aiAnalysis.confidence >= 70 ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-orange-500/20 text-orange-400"
                          )}>
                            {aiAnalysis.confidence}% Confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{aiAnalysis.reasoning}</p>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-background/50">
                            <Zap className="h-3 w-3 mr-1" />
                            {aiAnalysis.automationAdvice === 'auto_assign' ? 'Automatisch Toewijzen' :
                             aiAnalysis.automationAdvice === 'send_whatsapp' ? 'WhatsApp Versturen' :
                             'Handmatige Review'}
                          </Badge>
                          {aiAnalysis.riskFactors.length > 0 && (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {aiAnalysis.riskFactors.length} Aandachtspunt(en)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Driver Candidates */}
                {!isAnalyzing && candidates.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Top Kandidaten ({candidates.length})
                    </h4>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2 pr-4">
                        {candidates.map((candidate, index) => (
                          <div
                            key={candidate.driver.id}
                            className={cn(
                              "p-4 rounded-xl border transition-all",
                              index === 0 
                                ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30" 
                                : "bg-card/50 border-border/50 hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-full",
                                  index === 0 ? "bg-green-500/20" : "bg-muted"
                                )}>
                                  <User className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{candidate.driver.name}</span>
                                    {index === 0 && (
                                      <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                                        TOP
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    {candidate.driver.rating}
                                    <span>•</span>
                                    <Phone className="h-3 w-3" />
                                    {candidate.driver.phone || 'Geen nummer'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={cn("text-2xl font-bold", getScoreColor(candidate.overallScore))}>
                                  {candidate.overallScore}
                                </span>
                                <p className="text-xs text-muted-foreground">Score</p>
                              </div>
                            </div>

                            {/* Score breakdown */}
                            <div className="grid grid-cols-5 gap-2 mb-3">
                              {Object.entries(candidate.scores).map(([key, value]) => (
                                <div key={key} className="text-center">
                                  <div className="text-xs text-muted-foreground capitalize mb-1">
                                    {key === 'distance' ? '📍' : 
                                     key === 'availability' ? '✅' :
                                     key === 'workload' ? '📋' :
                                     key === 'rating' ? '⭐' : '📊'}
                                  </div>
                                  <Progress value={value} className="h-1.5" />
                                  <span className="text-[10px] text-muted-foreground">{value}</span>
                                </div>
                              ))}
                            </div>

                            {/* Reasoning */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {candidate.reasoning.map((reason, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] bg-muted/50">
                                  {reason}
                                </Badge>
                              ))}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between">
                              {getRecommendationBadge(candidate.recommendation)}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleInitiateDispatch(candidate)}
                                  className="h-8"
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  WhatsApp
                                </Button>
                                {candidate.recommendation === 'highly_recommended' && (
                                  <Button
                                    size="sm"
                                    className="h-8 bg-green-600 hover:bg-green-700"
                                    onClick={async () => {
                                      if (!selectedTripId) return;
                                      try {
                                        const { error } = await supabase
                                          .from('trips')
                                          .update({ driver_id: candidate.driver.id, status: 'gepland' satisfies TripStatus })
                                          .eq('id', selectedTripId);
                                        if (error) throw error;
                                        toast({ title: '✅ Direct Toegewezen', description: `${candidate.driver.name} is toegewezen.` });
                                        onAssigned?.();
                                        setShowAnalysis(false);
                                        setSelectedTripId(null);
                                        refetchTrips();
                                      } catch (e: any) {
                                        toast({ title: 'Toewijzing mislukt', description: e.message, variant: 'destructive' });
                                      }
                                    }}
                                  >
                                    <Zap className="h-3 w-3 mr-1" />
                                    Direct Toewijzen
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Right: Active Conversations */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-green-500" />
            Live Gesprekken
            {activeConversations.length > 0 && (
              <Badge className="ml-auto bg-green-500/20 text-green-400">
                {activeConversations.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Geen actieve gesprekken</p>
              <p className="text-xs">Start een dispatch om gesprekken te zien</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {activeConversations.map((conv: any) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      selectedConversation === conv.id 
                        ? "bg-primary/10 border-primary/30"
                        : "bg-card/50 border-border/50 hover:border-primary/30"
                    )}
                    onClick={() => setSelectedConversation(conv.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{conv.drivers?.name}</span>
                      <Badge variant="outline" className={cn(
                        "text-[10px]",
                        conv.status === 'awaiting_response' ? "bg-yellow-500/20 text-yellow-400" :
                        conv.status === 'confirmed' ? "bg-green-500/20 text-green-400" :
                        "bg-muted"
                      )}>
                        {conv.status === 'awaiting_response' ? 'Wacht op antwoord' :
                         conv.status === 'confirmed' ? 'Bevestigd' :
                         conv.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dedupCity(conv.trips?.pickup_city)} → {dedupCity(conv.trips?.delivery_city)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Message Thread */}
          {selectedConversation && messages.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h5 className="text-sm font-medium">Berichten</h5>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "p-2 rounded-lg text-xs",
                          msg.direction === 'outbound' 
                            ? "bg-primary/20 ml-4" 
                            : "bg-muted mr-4"
                        )}
                      >
                        <div className="flex items-center gap-1 mb-1 opacity-70">
                          {msg.direction === 'outbound' ? (
                            <Bot className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          <span>{msg.direction === 'outbound' ? 'AI' : 'Chauffeur'}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Confirm Assignment */}
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmAssign}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Bevestig & Wijs Toe
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
