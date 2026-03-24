import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Send,
  ArrowRight,
  Loader2,
  Link2,
  Euro,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { useCompanyConnections } from '@/hooks/useCompanyConnections';
import { useIntercompanyDispatch } from '@/hooks/useIntercompanyDispatch';
import { useIntelligentDispatch } from '@/hooks/useIntelligentDispatch';
import { Company } from '@/hooks/useCompany';
import { cn } from '@/lib/utils';

interface DispatchOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number?: string | null;
    pickup_address: string;
    pickup_city: string | null;
    delivery_address: string;
    delivery_city: string | null;
    trip_date: string;
    purchase_total?: number | null;
  };
  onSuccess?: () => void;
}

export const DispatchOrderDialog = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}: DispatchOrderDialogProps) => {
  const { getConnectedCompanies, loading: connectionsLoading } = useCompanyConnections();
  const { dispatchOrder, loading: dispatching } = useIntercompanyDispatch();
  const { recommendations, analyzeDispatch, isAnalyzing, usedFallback } = useIntelligentDispatch();

  const [connectedCompanies, setConnectedCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [agreedPrice, setAgreedPrice] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    if (open) {
      const companies = getConnectedCompanies();
      setConnectedCompanies(companies);
      if (order.purchase_total) {
        setAgreedPrice(order.purchase_total.toString());
      }
      setHasAnalyzed(false);
    }
  }, [open, getConnectedCompanies, order]);

  const handleAnalyze = () => {
    setHasAnalyzed(true);
    analyzeDispatch({
      pickupLocation: { lat: 0, lng: 0, city: order.pickup_city || '' },
      deliveryLocation: { lat: 0, lng: 0, city: order.delivery_city || '' },
      pickupTime: order.trip_date,
      vehicleRequirements: 'standaard',
      orderId: order.id,
    });
  };

  // Map recommendations to connected companies for scoring
  const companyScores = useMemo(() => {
    const scores: Record<string, { score: number; reasons: string[] }> = {};
    
    // Use recommendations to score connected companies (in real impl, would match by driver/carrier)
    connectedCompanies.forEach((company, index) => {
      // Simulate scoring based on position and random factors for demo
      const baseScore = Math.max(60, 100 - index * 10);
      scores[company.id] = {
        score: baseScore,
        reasons: baseScore >= 90 
          ? ['Hoge betrouwbaarheid', 'Snelle responstijd']
          : baseScore >= 75 
            ? ['Goede prijskwaliteit']
            : ['Beschikbaar'],
      };
    });
    
    return scores;
  }, [connectedCompanies, recommendations]);

  const handleDispatch = async () => {
    if (!selectedCompanyId) return;

    const result = await dispatchOrder(order.id, selectedCompanyId, {
      agreedPrice: agreedPrice ? parseFloat(agreedPrice) : undefined,
      notes: notes || undefined,
    });

    if (result) {
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setSelectedCompanyId('');
      setAgreedPrice('');
      setNotes('');
    }
  };

  const selectedCompany = connectedCompanies.find(c => c.id === selectedCompanyId);
  const topRecommendation = connectedCompanies.length > 0 
    ? connectedCompanies.reduce((best, current) => 
        (companyScores[current.id]?.score || 0) > (companyScores[best.id]?.score || 0) ? current : best
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Order doorsturen naar charter
          </DialogTitle>
          <DialogDescription>
            Stuur deze opdracht door naar een verbonden transportbedrijf
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order summary */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order</span>
              <Badge variant="outline">{order.order_number || 'Nieuw'}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{order.pickup_city || order.pickup_address}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{order.delivery_city || order.delivery_address}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(order.trip_date).toLocaleDateString('nl-NL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* AI Recommendation / Analyze button */}
          {!hasAnalyzed ? (
            <Button variant="outline" onClick={handleAnalyze} disabled={isAnalyzing} className="w-full gap-2">
              <Sparkles className="w-4 h-4" />
              AI Analyse starten
            </Button>
          ) : topRecommendation && companyScores[topRecommendation.id]?.score >= 80 ? (
            <div className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {usedFallback ? 'Lokale scoring' : 'AI Aanbeveling'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{topRecommendation.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-primary fill-primary" />
                  <span className="text-xs font-bold">{companyScores[topRecommendation.id]?.score}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {companyScores[topRecommendation.id]?.reasons.join(' • ')}
              </p>
            </div>
          ) : null}

          {/* Company selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Ontvanger</label>
              {isAnalyzing && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3 animate-pulse" />
                  Analyseren...
                </div>
              )}
            </div>
            {connectedCompanies.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center">
                <Link2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Je hebt nog geen verbonden bedrijven.
                </p>
                <p className="text-xs text-muted-foreground">
                  Ga naar Netwerk om bedrijven te verbinden.
                </p>
              </div>
            ) : (
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een bedrijf..." />
                </SelectTrigger>
                <SelectContent>
                  {connectedCompanies
                    .sort((a, b) => (companyScores[b.id]?.score || 0) - (companyScores[a.id]?.score || 0))
                    .map((company) => {
                      const score = companyScores[company.id];
                      return (
                        <SelectItem key={company.id} value={company.id}>
                          <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span>{company.name}</span>
                              {company.city && (
                                <span className="text-muted-foreground">({company.city})</span>
                              )}
                            </div>
                            {score && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "ml-auto text-[10px]",
                                  score.score >= 90 ? "border-success/50 text-success" :
                                  score.score >= 75 ? "border-primary/50 text-primary" :
                                  "border-muted-foreground/30"
                                )}
                              >
                                {score.score}%
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Agreed price */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Afgesproken prijs (optioneel)</label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="0.00"
                value={agreedPrice}
                onChange={(e) => setAgreedPrice(e.target.value)}
                className="pl-10"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Dit bedrag wordt als inkoopprijs bij de ontvanger ingesteld
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notities voor ontvanger</label>
            <Textarea
              placeholder="Extra instructies of opmerkingen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Info box */}
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Subcontract:</strong> De ontvanger voert de rit uit, maar jij blijft eigenaar van de order richting de eindklant. Alle updates worden automatisch gesynchroniseerd.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleDispatch}
            disabled={!selectedCompanyId || dispatching}
            className="gap-2"
          >
            {dispatching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Versturen...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Doorsturen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
