import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SystemHealthMetrics {
  tripsToday: number;
  tripsOnderweg: number;
  pendingCount: number;
  openInvoices: number;
  lastUpdated: Date;
}

export const useSystemHealth = () => {
  const [metrics, setMetrics] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const { count: tripsToday } = await supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("trip_date", today);

      const { count: tripsOnderweg } = await supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("status", "onderweg");

      const { count: pendingCount } = await supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("status", "gepland");

      const { count: openInvoices } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("status", "verzonden");

      setMetrics({
        tripsToday: tripsToday || 0,
        tripsOnderweg: tripsOnderweg || 0,
        pendingCount: pendingCount || 0,
        openInvoices: openInvoices || 0,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error("Health fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return { metrics, loading, refresh: fetchMetrics };
};
