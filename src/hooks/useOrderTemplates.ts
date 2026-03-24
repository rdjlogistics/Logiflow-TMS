import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, addWeeks, addMonths, getDay } from 'date-fns';

interface OrderTemplate {
  id: string;
  company_id: string;
  customer_id: string | null;
  name: string;
  description: string | null;
  pickup_address: string | null;
  pickup_city: string | null;
  pickup_postal_code: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  cargo_description: string | null;
  goods_type: string | null;
  weight_kg: number | null;
  sales_total: number | null;
  purchase_total: number | null;
  recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly' | null;
  recurrence_days: number[] | null;
  recurrence_day_of_month: number | null;
  next_run_date: string | null;
  last_run_date: string | null;
  is_active: boolean;
  preferred_driver_id: string | null;
  preferred_vehicle_id: string | null;
  created_at: string;
  updated_at: string;
  customers?: { company_name: string } | null;
}

export const useOrderTemplates = (companyId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all templates
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['order-templates', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('order_templates')
        .select('*, customers(company_name)')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return (data || []) as OrderTemplate[];
    },
    enabled: !!companyId,
  });

  // Create order from template
  const createOrderFromTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template niet gevonden');

      const { data, error } = await supabase
        .from('trips')
        .insert({
          customer_id: template.customer_id as string,
          trip_date: format(new Date(), 'yyyy-MM-dd'),
          pickup_address: template.pickup_address,
          pickup_city: template.pickup_city,
          delivery_address: template.delivery_address,
          delivery_city: template.delivery_city,
          cargo_description: template.cargo_description,
          sales_total: template.sales_total,
          purchase_total: template.purchase_total,
          driver_id: template.preferred_driver_id,
          vehicle_id: template.preferred_vehicle_id,
          status: 'gepland',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Order aangemaakt vanuit template' });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: () => {
      toast({ title: 'Fout bij aanmaken order', variant: 'destructive' });
    },
  });

  // Toggle template active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('order_templates')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.isActive ? 'Template geactiveerd' : 'Template gedeactiveerd' 
      });
      queryClient.invalidateQueries({ queryKey: ['order-templates'] });
    },
    onError: () => {
      toast({ title: 'Fout bij wijzigen', variant: 'destructive' });
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('order_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Template verwijderd' });
      queryClient.invalidateQueries({ queryKey: ['order-templates'] });
    },
    onError: () => {
      toast({ title: 'Fout bij verwijderen', variant: 'destructive' });
    },
  });

  // Run scheduled templates (creates orders for due templates)
  const runScheduledTemplates = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const currentDayOfWeek = getDay(new Date()) || 7; // 1-7, Sunday becomes 7

      const activeTemplates = templates.filter(t => 
        t.is_active && 
        t.next_run_date && 
        t.next_run_date <= today
      );

      const createdOrders: string[] = [];

      for (const template of activeTemplates) {
        // Check if should run based on recurrence type
        let shouldRun = false;

        switch (template.recurrence_type) {
          case 'daily':
            shouldRun = true;
            break;
          case 'weekly':
            shouldRun = template.recurrence_days?.includes(currentDayOfWeek) || false;
            break;
          case 'monthly':
            shouldRun = new Date().getDate() === template.recurrence_day_of_month;
            break;
          case 'once':
            shouldRun = template.next_run_date === today;
            break;
        }

        if (shouldRun) {
          // Create order
          const { data: order, error: orderError } = await supabase
            .from('trips')
            .insert({
              customer_id: template.customer_id as string,
              trip_date: today,
              pickup_address: template.pickup_address,
              pickup_city: template.pickup_city,
              delivery_address: template.delivery_address,
              delivery_city: template.delivery_city,
              cargo_description: template.cargo_description,
              sales_total: template.sales_total,
              purchase_total: template.purchase_total,
              driver_id: template.preferred_driver_id,
              vehicle_id: template.preferred_vehicle_id,
              status: 'gepland',
            } as any)
            .select()
            .single();

          if (!orderError && order) {
            createdOrders.push(order.id);

            // Log the run
            await supabase.from('recurring_order_runs').insert({
              template_id: template.id,
              trip_id: order.id,
              scheduled_date: today,
              status: 'created',
            });

            // Update next run date
            let nextDate: Date | null = null;
            const now = new Date();

            switch (template.recurrence_type) {
              case 'daily':
                nextDate = addDays(now, 1);
                break;
              case 'weekly':
                nextDate = addWeeks(now, 1);
                break;
              case 'monthly':
                nextDate = addMonths(now, 1);
                break;
              case 'once':
                // Deactivate after single run
                await supabase
                  .from('order_templates')
                  .update({ is_active: false })
                  .eq('id', template.id);
                break;
            }

            if (nextDate) {
              await supabase
                .from('order_templates')
                .update({ 
                  next_run_date: format(nextDate, 'yyyy-MM-dd'),
                  last_run_date: today,
                })
                .eq('id', template.id);
            }
          }
        }
      }

      return createdOrders;
    },
    onSuccess: (createdOrders) => {
      if (createdOrders.length > 0) {
        toast({ title: `${createdOrders.length} herhaalorders aangemaakt` });
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['order-templates'] });
      }
    },
    onError: () => {
      toast({ title: 'Fout bij uitvoeren templates', variant: 'destructive' });
    },
  });

  return {
    templates,
    isLoading,
    error,
    createOrderFromTemplate,
    toggleActive,
    deleteTemplate,
    runScheduledTemplates,
    activeTemplates: templates.filter(t => t.is_active),
    inactiveTemplates: templates.filter(t => !t.is_active),
  };
};

export default useOrderTemplates;
