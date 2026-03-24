import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

export interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  counterparty_name: string | null;
  counterparty_iban: string | null;
  reference: string | null;
  is_matched: boolean | null;
  needs_review: boolean | null;
  match_confidence: number | null;
  matched_invoice_id: string | null;
  status: string | null;
  bank_account: string | null;
  currency: string | null;
  company_id: string | null;
  invoice?: {
    id: string;
    invoice_number: string;
    total_amount: number;
    customer_id: string | null;
  } | null;
}

export function useBankTransactions(companyId: string | undefined) {
  return useQuery({
    queryKey: ['bank-transactions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*, invoices:matched_invoice_id(id, invoice_number, total_amount, customer_id)')
        .eq('company_id', companyId)
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        invoice: t.invoices || null,
      })) as BankTransaction[];
    },
    enabled: !!companyId,
  });
}

export function useRunAIMatching(companyId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Geen bedrijf geselecteerd');
      const { data, error } = await supabase.functions.invoke('bank-reconcile', {
        body: { tenant_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({
        title: 'AI Matching voltooid',
        description: `${data.matched} automatisch gematcht, ${data.needs_review} ter review, ${data.unmatched} niet gematcht`,
      });
    },
    onError: (err: any) => {
      toast({ title: 'Matching mislukt', description: err.message, variant: 'destructive' });
    },
  });
}

export function useConfirmMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('bank_transactions')
        .update({ is_matched: true, needs_review: false, status: 'matched' })
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({ title: 'Match bevestigd' });
    },
  });
}

export function useUnmatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          is_matched: false,
          needs_review: false,
          matched_invoice_id: null,
          match_confidence: null,
          status: null,
        })
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({ title: 'Match ongedaan gemaakt' });
    },
  });
}

export function useManualMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ transactionId, invoiceId }: { transactionId: string; invoiceId: string }) => {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          matched_invoice_id: invoiceId,
          is_matched: true,
          needs_review: false,
          match_confidence: 100,
          status: 'manual',
        })
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({ title: 'Handmatig gekoppeld' });
    },
  });
}

export function useImportBankStatement(companyId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const importCSV = useCallback(async (file: File) => {
    if (!companyId) return;
    setImporting(true);

    try {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (result.errors.length > 0) {
        throw new Error(`CSV parse fout: ${result.errors[0].message}`);
      }

      const rows = result.data as any[];
      const transactions = rows.map(row => ({
        company_id: companyId,
        transaction_date: row.datum || row.date || row.Datum || row.Date || new Date().toISOString().split('T')[0],
        description: row.omschrijving || row.description || row.Omschrijving || row.Description || null,
        amount: parseFloat(String(row.bedrag || row.amount || row.Bedrag || row.Amount || '0').replace(',', '.')),
        counterparty_name: row.tegenpartij || row.counterparty || row.Tegenpartij || row.Naam || row.name || null,
        counterparty_iban: row.iban || row.IBAN || row.tegenrekening || null,
        reference: row.referentie || row.reference || row.Referentie || row.kenmerk || null,
        bank_account: row.rekening || row.account || null,
        currency: row.valuta || row.currency || 'EUR',
        is_matched: false,
        needs_review: false,
      })).filter(t => !isNaN(t.amount) && t.amount !== 0);

      if (transactions.length === 0) throw new Error('Geen geldige transacties gevonden in CSV');

      const { error } = await supabase.from('bank_transactions').insert(transactions);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({
        title: 'Import geslaagd',
        description: `${transactions.length} transacties geïmporteerd`,
      });
    } catch (err: any) {
      toast({ title: 'Import mislukt', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }, [companyId, queryClient, toast]);

  return { importCSV, importing };
}
