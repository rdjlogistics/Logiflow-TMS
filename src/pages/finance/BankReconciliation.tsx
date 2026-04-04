import { useState, useMemo, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Loader2, Wallet, ArrowUpRight, ArrowDownRight, Brain, Upload, CheckCircle2, XCircle, Link2, Sparkles, Eye, AlertTriangle, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  useBankTransactions,
  useRunAIMatching,
  useConfirmMatch,
  useUnmatch,
  useImportBankStatement,
  type BankTransaction,
} from '@/hooks/useBankReconciliation';
import { useCompany } from '@/hooks/useCompany';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  matched: { label: 'Gematcht', variant: 'default' },
  manual: { label: 'Handmatig', variant: 'default' },
  suggested: { label: 'Suggestie', variant: 'secondary' },
  ai_suggested: { label: 'AI Suggestie', variant: 'secondary' },
};

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color = score >= 85 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-red-500';
  return (
    <span className={`text-xs font-bold ${color}`}>
      {score}%
    </span>
  );
}

export default function BankReconciliation() {
  const { company } = useCompany();
  const companyId = company?.id;

  const { data: transactions = [], isLoading } = useBankTransactions(companyId);
  const aiMatching = useRunAIMatching(companyId);
  const confirmMatch = useConfirmMatch();
  const unmatch = useUnmatch();
  const { importCSV, importing } = useImportBankStatement(companyId);

  const [filter, setFilter] = useState<'all' | 'unmatched' | 'review' | 'matched'>('all');
  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'unmatched': return transactions.filter(t => !t.is_matched && !t.needs_review);
      case 'review': return transactions.filter(t => t.needs_review);
      case 'matched': return transactions.filter(t => t.is_matched);
      default: return transactions;
    }
  }, [transactions, filter]);

  const stats = useMemo(() => {
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    const matchedAmt = transactions.filter(t => t.is_matched).reduce((s, t) => s + t.amount, 0);
    const unmatchedCount = transactions.filter(t => !t.is_matched && !t.needs_review).length;
    const reviewCount = transactions.filter(t => t.needs_review).length;
    return { total, matchedAmt, unmatchedCount, reviewCount };
  }, [transactions]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importCSV(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [importCSV]);

  return (
    <DashboardLayout title="Bank Reconciliatie" description="Automatisch banktransacties koppelen aan facturen met AI">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card variant="glass">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Totaal saldo</p>
                <p className="text-lg sm:text-2xl font-bold truncate">€{stats.total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p>
              </div>
              <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Gematcht</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-500 truncate">€{stats.matchedAmt.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Te matchen</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-500">{stats.unmatchedCount}</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Ter review</p>
                <p className="text-lg sm:text-2xl font-bold text-primary">{stats.reviewCount}</p>
              </div>
              <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-6">
        <div className="flex gap-2">
          <Button
            onClick={() => aiMatching.mutate()}
            disabled={aiMatching.isPending || !companyId}
            className="gap-2 flex-1 sm:flex-none min-h-[44px]"
          >
            {aiMatching.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            AI Matching starten
          </Button>
          <Button variant="outline" className="gap-2 flex-1 sm:flex-none min-h-[44px]" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            CSV Importeren
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />

        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:ml-auto snap-x snap-mandatory scrollbar-none">
          {(['all', 'unmatched', 'review', 'matched'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="whitespace-nowrap snap-start min-h-[44px] touch-manipulation"
            >
              {f === 'all' ? 'Alle' : f === 'unmatched' ? 'Te matchen' : f === 'review' ? 'Review' : 'Gematcht'}
              {f === 'review' && stats.reviewCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0">{stats.reviewCount}</Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Transaction Table */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <CardTitle>Transacties</CardTitle>
            <span className="text-sm text-muted-foreground ml-2">({filtered.length})</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="sm:hidden divide-y divide-border/30">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Landmark className="h-8 w-8" />
                    <p className="font-medium">Geen transacties</p>
                    <p className="text-sm">Importeer een CSV-bestand om te beginnen</p>
                  </div>
                ) : (
                  filtered.map(tx => (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="p-4 cursor-pointer active:bg-muted/30 transition-colors touch-manipulation"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{tx.counterparty_name || tx.description || 'Onbekend'}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{tx.description || '-'}</p>
                        </div>
                        <span className={`font-bold text-sm tabular-nums flex-shrink-0 ${tx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {tx.amount >= 0 ? '+' : ''}€{Math.abs(tx.amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(tx.transaction_date), 'dd MMM yyyy', { locale: nl })}
                          </span>
                          {tx.status && statusConfig[tx.status] ? (
                            <Badge variant={statusConfig[tx.status].variant} className="text-[10px] px-1.5 py-0">
                              {tx.status === 'ai_suggested' && <Sparkles className="h-3 w-3 mr-0.5" />}
                              {statusConfig[tx.status].label}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Open</span>
                          )}
                          {tx.match_confidence != null && <ConfidenceBadge score={tx.match_confidence} />}
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          {tx.needs_review && tx.matched_invoice_id && (
                            <>
                              <Button size="sm" variant="ghost" className="h-9 w-9 text-emerald-500 touch-manipulation" onClick={() => confirmMatch.mutate(tx.id)} disabled={confirmMatch.isPending}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-9 w-9 text-red-500 touch-manipulation" onClick={() => unmatch.mutate(tx.id)} disabled={unmatch.isPending}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {tx.is_matched && (
                            <Button size="sm" variant="ghost" className="h-9 w-9 touch-manipulation" onClick={() => unmatch.mutate(tx.id)} disabled={unmatch.isPending}>
                              <Link2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Omschrijving</TableHead>
                      <TableHead>Tegenpartij</TableHead>
                      <TableHead className="text-right">Bedrag</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Factuur</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableEmpty
                        icon={<Landmark className="h-6 w-6 text-muted-foreground" />}
                        title="Geen transacties"
                        description="Importeer een CSV-bestand om te beginnen"
                        colSpan={8}
                      />
                    ) : (
                      filtered.map(tx => (
                        <TableRow
                          key={tx.id}
                          isClickable
                          onClick={() => setSelectedTx(tx)}
                          className="cursor-pointer"
                        >
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(new Date(tx.transaction_date), 'dd MMM yyyy', { locale: nl })}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{tx.description || '-'}</TableCell>
                          <TableCell className="text-sm">{tx.counterparty_name || '-'}</TableCell>
                          <TableCell className={`text-right font-mono font-medium text-sm ${tx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {tx.amount >= 0 ? '+' : ''}€{Math.abs(tx.amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <ConfidenceBadge score={tx.match_confidence} />
                          </TableCell>
                          <TableCell>
                            {tx.status && statusConfig[tx.status] ? (
                              <Badge variant={statusConfig[tx.status].variant} className="text-xs">
                                {tx.status === 'ai_suggested' && <Sparkles className="h-3 w-3 mr-1" />}
                                {statusConfig[tx.status].label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Open</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {tx.invoice?.invoice_number || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              {tx.needs_review && tx.matched_invoice_id && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-emerald-500 hover:text-emerald-600"
                                    onClick={() => confirmMatch.mutate(tx.id)}
                                    disabled={confirmMatch.isPending}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-red-500 hover:text-red-600"
                                    onClick={() => unmatch.mutate(tx.id)}
                                    disabled={unmatch.isPending}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {tx.is_matched && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => unmatch.mutate(tx.id)}
                                  disabled={unmatch.isPending}
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <SheetContent className="sm:max-w-lg">
          {selectedTx && (
            <>
              <SheetHeader>
                <SheetTitle>Transactie Details</SheetTitle>
                <SheetDescription>
                  {format(new Date(selectedTx.transaction_date), 'dd MMMM yyyy', { locale: nl })}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Bedrag</p>
                    <p className={`text-lg font-bold ${selectedTx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {selectedTx.amount >= 0 ? '+' : ''}€{Math.abs(selectedTx.amount).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Match Score</p>
                    <p className="text-lg font-bold">
                      <ConfidenceBadge score={selectedTx.match_confidence} />
                      {!selectedTx.match_confidence && <span className="text-muted-foreground">-</span>}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Omschrijving</p>
                  <p className="text-sm">{selectedTx.description || '-'}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Tegenpartij</p>
                  <p className="text-sm">{selectedTx.counterparty_name || '-'}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">IBAN</p>
                  <p className="text-sm font-mono">{selectedTx.counterparty_iban || '-'}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Referentie</p>
                  <p className="text-sm">{selectedTx.reference || '-'}</p>
                </div>

                {selectedTx.invoice && (
                  <Card variant="glass" className="mt-4">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Gekoppelde factuur</p>
                          <p className="font-medium">{selectedTx.invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            €{selectedTx.invoice.total_amount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        {selectedTx.status && statusConfig[selectedTx.status] && (
                          <Badge variant={statusConfig[selectedTx.status].variant}>
                            {statusConfig[selectedTx.status].label}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2 pt-4">
                  {selectedTx.needs_review && selectedTx.matched_invoice_id && (
                    <>
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => { confirmMatch.mutate(selectedTx.id); setSelectedTx(null); }}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Bevestigen
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => { unmatch.mutate(selectedTx.id); setSelectedTx(null); }}
                      >
                        <XCircle className="h-4 w-4" /> Afwijzen
                      </Button>
                    </>
                  )}
                  {selectedTx.is_matched && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => { unmatch.mutate(selectedTx.id); setSelectedTx(null); }}
                    >
                      <Link2 className="h-4 w-4" /> Ontkoppelen
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
