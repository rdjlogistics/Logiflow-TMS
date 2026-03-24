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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { Loader2, Gift, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const giftOptions = [
  { id: 'bloemen', label: 'Bloemen', emoji: '💐', defaultPrice: 45 },
  { id: 'wijn', label: 'Wijn', emoji: '🍷', defaultPrice: 35 },
  { id: 'chocolade', label: 'Chocolade', emoji: '🍫', defaultPrice: 25 },
  { id: 'cadeaubon', label: 'Cadeaubon', emoji: '🎁', defaultPrice: 50 },
  { id: 'taart', label: 'Taart', emoji: '🎂', defaultPrice: 40 },
  { id: 'anders', label: 'Anders', emoji: '✨', defaultPrice: 0 },
];

interface SendGiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
  momentType?: string;
  onSuccess?: () => void;
  onSend?: (giftData: {
    type: string;
    message: string;
    budget: number;
    deliveryAddress?: string;
  }) => Promise<void>;
}

export function SendGiftDialog({
  open,
  onOpenChange,
  customerName = 'Klant',
  momentType = 'moment',
  onSuccess,
  onSend,
}: SendGiftDialogProps) {
  const [selectedGift, setSelectedGift] = useState('bloemen');
  const [message, setMessage] = useState('');
  const [budget, setBudget] = useState('50');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [sending, setSending] = useState(false);

  const selectedGiftData = giftOptions.find(g => g.id === selectedGift);

  const handleSend = async () => {
    setSending(true);
    try {
      if (onSend) {
        await onSend({
          type: selectedGift,
          message,
          budget: parseFloat(budget) || 0,
          deliveryAddress: deliveryAddress || undefined,
        });
      }
      
      toast({
        title: "Cadeau gepland! 🎁",
        description: `${selectedGiftData?.emoji} ${selectedGiftData?.label} wordt verstuurd naar ${customerName}.`,
      });
      
      // Reset form
      setMessage('');
      setBudget('50');
      setDeliveryAddress('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fout bij plannen cadeau",
        description: error.message || "Er ging iets mis.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Cadeau Versturen
          </DialogTitle>
          <DialogDescription>
            Stuur een attentie naar {customerName} voor {momentType.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Gift Type Selection */}
          <div className="space-y-3">
            <Label>Kies een cadeau</Label>
            <RadioGroup 
              value={selectedGift} 
              onValueChange={setSelectedGift}
              className="grid grid-cols-3 gap-3"
            >
              {giftOptions.map((gift) => (
                <Card 
                  key={gift.id}
                  className={`cursor-pointer transition-all ${
                    selectedGift === gift.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setSelectedGift(gift.id)}
                >
                  <CardContent className="p-3 text-center">
                    <RadioGroupItem value={gift.id} id={gift.id} className="sr-only" />
                    <div className="text-2xl mb-1">{gift.emoji}</div>
                    <Label htmlFor={gift.id} className="text-sm cursor-pointer">
                      {gift.label}
                    </Label>
                    {gift.defaultPrice > 0 && (
                      <div className="text-xs text-muted-foreground">
                        ±€{gift.defaultPrice}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label>Budget (€)</Label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="50"
              min="0"
              step="5"
            />
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label>Persoonlijk bericht</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Schrijf een persoonlijke boodschap..."
              rows={3}
            />
          </div>

          {/* Delivery Address (optional) */}
          <div className="space-y-2">
            <Label>Afleveradres (optioneel)</Label>
            <Input
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Standaard: bedrijfsadres klant"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Versturen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
