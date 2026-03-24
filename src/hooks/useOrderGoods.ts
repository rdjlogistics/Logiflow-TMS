import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToastFeedback } from "@/hooks/useToastFeedback";
import type { OrderGoods, OrderGoodsInsert, OrderGoodsUpdate } from "@/types/supabase-helpers";

export type OrderGoodsLine = OrderGoods;
export type GoodsLineInput = Omit<OrderGoodsInsert, 'id' | 'created_at' | 'trip_id'>;

export const useOrderGoods = (tripId: string | null) => {
  const [goods, setGoods] = useState<OrderGoodsLine[]>([]);
  const [loading, setLoading] = useState(false);
  const feedback = useToastFeedback();

  const fetchGoods = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("order_goods")
        .select("*")
        .eq("trip_id", tripId)
        .order("line_number", { ascending: true });

      if (error) throw error;
      setGoods(data || []);
    } catch (err: any) {
      console.error("Error fetching goods:", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const addGoodsLine = useCallback(async (lineData: Partial<GoodsLineInput>) => {
    if (!tripId) return null;
    try {
      const nextLineNumber = goods.length > 0 ? Math.max(...goods.map(g => g.line_number)) + 1 : 1;
      const insertPayload: OrderGoodsInsert = {
        trip_id: tripId,
        line_number: nextLineNumber,
        quantity: lineData.quantity || 1,
        packaging_type: lineData.packaging_type || 'Colli',
        weight_per_unit: lineData.weight_per_unit,
        total_weight: lineData.total_weight,
        length_cm: lineData.length_cm,
        width_cm: lineData.width_cm,
        height_cm: lineData.height_cm,
        volume_m3: lineData.volume_m3,
        loading_meters: lineData.loading_meters,
        description: lineData.description,
        pickup_stop_id: lineData.pickup_stop_id,
        delivery_stop_id: lineData.delivery_stop_id,
      };
      const { data, error } = await supabase
        .from("order_goods")
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      setGoods(prev => [...prev, data]);
      feedback.saved();
      return data;
    } catch (err: any) {
      feedback.error("Goederenregel toevoegen mislukt");
      console.error(err);
      return null;
    }
  }, [tripId, goods, feedback]);

  const updateGoodsLine = useCallback(async (id: string, updates: Partial<GoodsLineInput>) => {
    try {
      const { error } = await supabase
        .from("order_goods")
        .update(updates as OrderGoodsUpdate)
        .eq("id", id);

      if (error) throw error;
      setGoods(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
      return true;
    } catch (err: any) {
      feedback.error("Verwijderen mislukt");
      console.error(err);
      return false;
    }
  }, [feedback]);

  const deleteGoodsLine = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("order_goods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setGoods(prev => prev.filter(g => g.id !== id));
      feedback.deleted("Goederenregel");
      return true;
    } catch (err: any) {
      feedback.error("Verwijderen mislukt");
      console.error(err);
      return false;
    }
  }, [feedback]);

  return { goods, loading, fetchGoods, addGoodsLine, updateGoodsLine, deleteGoodsLine };
};
