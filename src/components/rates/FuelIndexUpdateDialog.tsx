import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FuelIndexUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIndex?: number;
  referencePrice?: number;
  onUpdate?: (newIndex: number, newPrice: number) => Promise<void>;
}

export function FuelIndexUpdateDialog({
  open,
  onOpenChange,
  currentIndex = 12.5,
  referencePrice = 1.45,
  onUpdate,
}: FuelIndexUpdateDialogProps) {
  const [currentPrice, setCurrentPrice] = useState('1.85');
  const [newReferencePrice, setNewReferencePrice] = useState(referencePrice.toString());
  const [loading, setLoading] = useState(false);

  const calculatedIndex = ((parseFloat(currentPrice) - parseFloat(newReferencePrice)) / parseFloat(newReferencePrice)) * 100;
  const indexChange = calculatedIndex - currentIndex;

  const handleUpdate = async () => {
    setLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(calculatedIndex, parseFloat(newReferencePrice));
      }
      
      toast({
        title: "Brandstofindex bijgewerkt",
        description: `Nieuwe index: ${calculatedIndex.toFixed(1)}%`,
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fout bij bijwerken",
        description: error.message || "Er ging iets mis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Brandstofindex Bijwerken
          </DialogTitle>
          <DialogDescription>
            Bereken de nieuwe brandstoftoeslag op basis van actuele dieselprijzen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Index */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Huidige Index</p>
                  <p className="text-2xl font-bold">{currentIndex.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Referentieprijs</p>
                  <p className="text-lg font-semibold">€{referencePrice.toFixed(2)}/L</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Diesel Price */}
          <div className="space-y-2">
            <Label>Huidige dieselprijs (€/L)</Label>
            <Input
              type="number"
              step="0.001"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="1.85"
            />
            <p className="text-xs text-muted-foreground">
              Voer de actuele dieselprijs in van uw leverancier
            </p>
          </div>

          {/* New Reference Price */}
          <div className="space-y-2">
            <Label>Referentieprijs (€/L)</Label>
            <Input
              type="number"
              step="0.01"
              value={newReferencePrice}
              onChange={(e) => setNewReferencePrice(e.target.value)}
              placeholder="1.45"
            />
            <p className="text-xs text-muted-foreground">
              De basisprijs waartegen de index wordt berekend
            </p>
          </div>

          {/* New Index Preview */}
          <Card className={`border-2 ${
            indexChange > 0 ? 'border-amber-500/50 bg-amber-500/5' :
            indexChange < 0 ? 'border-emerald-500/50 bg-emerald-500/5' :
            'border-muted'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nieuwe Index</p>
                  <p className="text-2xl font-bold">{calculatedIndex.toFixed(1)}%</p>
                </div>
                <div className="flex items-center gap-2">
                  {indexChange > 0 ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-amber-500" />
                      <span className="text-amber-500 font-medium">+{indexChange.toFixed(1)}%</span>
                    </>
                  ) : indexChange < 0 ? (
                    <>
                      <TrendingDown className="h-5 w-5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">{indexChange.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <Minus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground font-medium">Geen wijziging</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Index Bijwerken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
