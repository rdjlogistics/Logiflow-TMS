import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ExpenseCategory = 'fuel' | 'toll' | 'parking' | 'meal' | 'other';

export interface DriverExpense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  description: string | null;
  receipt_url: string | null;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected';
  trip_id: string | null;
  created_at: string;
}

interface UseDriverExpensesReturn {
  expenses: DriverExpense[];
  loading: boolean;
  totalPending: number;
  addExpense: (params: {
    category: ExpenseCategory;
    amount: number;
    description?: string;
    receiptFile?: File;
    tripId?: string;
  }) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: 'Brandstof',
  toll: 'Tol',
  parking: 'Parkeren',
  meal: 'Maaltijd',
  other: 'Overig',
};

export function useDriverExpenses(): UseDriverExpensesReturn {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<DriverExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('drivers')
      .select('id, tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDriverId(data.id);
          setTenantId(data.tenant_id);
        }
      });
  }, [user?.id]);

  const fetchExpenses = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    const { data } = await supabase
      .from('driver_expenses')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(100);

    setExpenses((data as DriverExpense[]) || []);
    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const totalPending = useMemo(() => {
    return expenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const addExpense = useCallback(async ({
    category,
    amount,
    description,
    receiptFile,
    tripId,
  }: {
    category: ExpenseCategory;
    amount: number;
    description?: string;
    receiptFile?: File;
    tripId?: string;
  }): Promise<boolean> => {
    if (!driverId || !tenantId) return false;

    let receiptUrl: string | null = null;

    // Upload receipt if provided
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop() || 'jpg';
      const path = `expenses/${driverId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('pod-files')
        .upload(path, receiptFile);
      if (!uploadError) {
        receiptUrl = path;
      }
    }

    const { error } = await supabase
      .from('driver_expenses')
      .insert({
        driver_id: driverId,
        tenant_id: tenantId,
        category: category as any,
        amount,
        description: description || null,
        receipt_url: receiptUrl,
        trip_id: tripId || null,
      });

    if (error) {
      console.error('Add expense error:', error);
      return false;
    }

    await fetchExpenses();
    return true;
  }, [driverId, tenantId, fetchExpenses]);

  return {
    expenses,
    loading,
    totalPending,
    addExpense,
    refetch: fetchExpenses,
  };
}
