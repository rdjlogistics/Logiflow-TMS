import { useState, useRef } from 'react';
import { 
  useDriverExpenses, 
  EXPENSE_CATEGORY_LABELS, 
  type ExpenseCategory, 
  type DriverExpense 
} from '@/hooks/useDriverExpenses';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import {
  Receipt,
  Plus,
  Camera,
  Fuel,
  ParkingCircle,
  UtensilsCrossed,
  Coins,
  Loader2,
  ArrowLeft,
  Check,
  Clock,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpensesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTripId?: string;
}

const categoryIcons: Record<ExpenseCategory, typeof Fuel> = {
  fuel: Fuel,
  toll: Coins,
  parking: ParkingCircle,
  meal: UtensilsCrossed,
  other: Receipt,
};

const statusStyles: Record<string, { color: string; icon: typeof Check }> = {
  pending: { color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: Clock },
  approved: { color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: Check },
  rejected: { color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: XCircle },
};

export function ExpensesSheet({ open, onOpenChange, activeTripId }: ExpensesSheetProps) {
  const { expenses, loading, totalPending, addExpense } = useDriverExpenses();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: 'Vul een geldig bedrag in', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const success = await addExpense({
      category,
      amount: numAmount,
      description: description || undefined,
      receiptFile: receiptFile || undefined,
      tripId: activeTripId,
    });
    setSubmitting(false);

    if (success) {
      toast({ title: '✅ Onkosten ingediend' });
      resetForm();
    } else {
      toast({ title: 'Fout bij indienen', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setCategory('fuel');
    setAmount('');
    setDescription('');
    setReceiptFile(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {showForm && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetForm}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Receipt className="h-5 w-5 text-primary" />
            {showForm ? 'Nieuwe onkosten' : 'Onkosten'}
          </SheetTitle>
          <SheetDescription>
            {showForm ? 'Voeg een nieuw onkostenbewijs toe' : 'Beheer je declaraties'}
          </SheetDescription>
        </SheetHeader>
          {showForm ? (
            <div
              key="form"
              className="flex-1 overflow-y-auto py-4 space-y-5"
            >
              {/* Category picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Categorie</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([key, label]) => {
                    const Icon = categoryIcons[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(key)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                          category === key
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", category === key ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bedrag (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg font-mono"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Beschrijving (optioneel)</label>
                <Textarea
                  placeholder="Bijv. Tankbeurt A2 Shell..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>

              {/* Receipt photo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bon / Bewijs</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setReceiptFile(file);
                  }}
                />
                {receiptFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm flex-1 truncate">{receiptFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setReceiptFile(null)}>
                      Wijzig
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Maak foto van bon
                  </Button>
                )}
              </div>

              {/* Submit */}
              <Button
                className="w-full h-12"
                onClick={handleSubmit}
                disabled={submitting || !amount}
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Check className="h-5 w-5 mr-2" />
                )}
                Indienen
              </Button>
            </div>
          ) : (
            <div
              key="list"
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Total pending */}
              {totalPending > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 my-3">
                  <span className="text-sm font-medium text-amber-500">Openstaand</span>
                  <span className="text-lg font-bold text-amber-500">€{totalPending.toFixed(2)}</span>
                </div>
              )}

              {/* Expenses list */}
              <ScrollArea className="flex-1">
                <div className="space-y-2 py-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Nog geen onkosten</p>
                    </div>
                  ) : (
                    expenses.map((expense) => {
                      const Icon = categoryIcons[expense.category];
                      const status = statusStyles[expense.status];
                      const StatusIcon = status.icon;
                      return (
                        <div
                          key={expense.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40"
                        >
                          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {EXPENSE_CATEGORY_LABELS[expense.category]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {expense.description || expense.expense_date}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <span className="text-sm font-bold">€{Number(expense.amount).toFixed(2)}</span>
                            <Badge variant="outline" className={cn("text-[10px]", status.color)}>
                              <StatusIcon className="h-3 w-3 mr-0.5" />
                              {expense.status === 'pending' ? 'Open' : expense.status === 'approved' ? 'Goed' : 'Afg.'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Add button */}
              <div className="flex-shrink-0 pt-3 border-t border-border/50">
                <Button className="w-full h-12" onClick={() => setShowForm(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Nieuwe onkosten
                </Button>
              </div>
            </div>
          )}
      </SheetContent>
    </Sheet>
  );
}
