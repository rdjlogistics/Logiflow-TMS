import React, { useState } from 'react';
import type { TripStatus } from "@/types/supabase-helpers";
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CreateCompositeRouteDialog from './CreateCompositeRouteDialog';
import { supabase } from '@/integrations/supabase/client';
import { ToastAction } from '@/components/ui/toast';
import { berekenBTW } from '@/lib/btw-calculator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  FileText,
  Truck,
  Trash2,
  Download,
  ChevronDown,
  Loader2,
  X,
  ArrowRight,
  UserPlus,
  Tag,
  Printer,
  Mail,
  Clock,
  Shield,
  Send,
  Route,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { writeExcelFile } from '@/lib/excelUtils';
import { notifyCustomerStatusChange } from '@/lib/customerNotifications';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  order_number: string | null;
  trip_date: string;
  status: string;
  sales_total: number | null;
  purchase_total: number | null;
  customer_id: string | null;
  driver_id: string | null;
  carrier_id: string | null;
  customers?: { company_name: string; email?: string; contact_name?: string } | null;
  pickup_city?: string | null;
  pickup_address?: string | null;
  delivery_city?: string | null;
  delivery_address?: string | null;
  cmr_number?: string | null;
  waybill_number?: string | null;
}

interface Driver {
  id: string;
  name: string;
}

interface EnhancedBulkActionsBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  orders: Order[];
  drivers?: Driver[];
  onRefresh: () => void;
}

type BulkAction = 
  | 'status_offerte'
  | 'status_gepland' 
  | 'status_onderweg' 
  | 'status_afgerond' 
  | 'status_gecontroleerd'
  | 'create_invoices' 
  | 'export' 
  | 'delete'
  | 'assign_driver'
  | 'print_cmr'
  | 'send_confirmation'
  | 'send_transport_order'
  | 'create_composite_route';

function Divider() {
  return <div className="w-px h-7 bg-border/30 shrink-0" />;
}

interface ActionBtnProps {
  icon: React.ElementType;
  label: string;
  tooltip: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  badge?: number;
}

function ActionBtn({ icon: Icon, label, tooltip, onClick, className, disabled, badge }: ActionBtnProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'gap-1.5 h-9 px-3 rounded-xl font-medium transition-all duration-150',
            'hover:bg-background/60 hover:shadow-sm',
            className,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label && <span className="hidden md:inline text-xs">{label}</span>}
          {badge !== undefined && (
            <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-md bg-primary/15 text-primary text-[10px] font-bold tabular-nums">
              {badge}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export const EnhancedBulkActionsBar: React.FC<EnhancedBulkActionsBarProps> = ({
  selectedIds,
  onClear,
  orders,
  drivers = [],
  onRefresh,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignDriverDialogOpen, setAssignDriverDialogOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [transportOrderDialogOpen, setTransportOrderDialogOpen] = useState(false);
  const [transportOrderRemark, setTransportOrderRemark] = useState("");
  const [compositeRouteDialogOpen, setCompositeRouteDialogOpen] = useState(false);

  const selectedOrders = orders.filter(o => selectedIds.has(o.id));
  const count = selectedIds.size;

  // Summary stats for selected orders
  const stats = {
    totalRevenue: selectedOrders.reduce((sum, o) => sum + (o.sales_total || 0), 0),
    totalProfit: selectedOrders.reduce((sum, o) => sum + ((o.sales_total || 0) - (o.purchase_total || 0)), 0),
    needsDriver: selectedOrders.filter(o => !o.driver_id && !o.carrier_id).length,
    readyToInvoice: selectedOrders.filter(o => o.status === 'afgerond' || o.status === 'gecontroleerd').length,
  };

  // Bulk status update
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      setIsProcessing(true);
      const ids = Array.from(selectedIds);

      // Build metadata payload based on target status
      const now = new Date().toISOString();
      const statusPayload: Record<string, any> = { status: newStatus as any };

      if (newStatus === 'onderweg') {
        statusPayload.actual_departure = now;
      }
      if (['afgeleverd', 'afgerond'].includes(newStatus)) {
        statusPayload.actual_arrival = now;
      }
      if (newStatus === 'afgerond') {
        statusPayload.checkout_completed_at = now;
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) statusPayload.checkout_completed_by = userId;
      }

      const { error } = await supabase
        .from('trips')
        .update(statusPayload)
        .in('id', ids);

      if (error) throw error;

      // B2B notifications for each affected order (non-blocking)
      const affectedOrders = orders.filter(o => ids.includes(o.id));
      for (const order of affectedOrders) {
        notifyCustomerStatusChange(order.customer_id, order.id, newStatus, order.order_number);
      }

      // Auto-send vrachtbrief for terminal statuses (non-blocking, respects tenant setting)
      if (['afgerond', 'afgeleverd'].includes(newStatus)) {
        const { data: tSettings } = await supabase.from('tenant_settings').select('auto_send_pod_email').limit(1).maybeSingle();
        if (tSettings?.auto_send_pod_email) {
          for (const id of ids) {
            supabase.functions.invoke('auto-send-vrachtbrief', { body: { tripId: id } }).catch((e) => console.warn('Vrachtbrief verzenden mislukt:', e));
          }
        }
      }

      // Send delivery confirmation for afgeleverd (non-blocking)
      if (newStatus === 'afgeleverd') {
        for (const id of ids) {
          supabase.functions.invoke('send-delivery-confirmation', { body: { tripId: id } }).catch((e) => console.warn('Leverbevestiging verzenden mislukt:', e));
        }
      }

      // Log events (non-blocking)
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        await supabase.from('order_events').insert(
          ids.map(id => ({
            order_id: id,
            event_type: 'STATUS_UPDATED',
            actor_user_id: userId,
            payload: { old_value: 'bulk', new_value: newStatus, source: 'bulk_action' },
          }))
        );
      } catch {
        // Silent
      }

      return ids.length;
    },
    onSuccess: (count) => {
      toast({ title: `${count} orders bijgewerkt naar ${confirmAction?.replace('status_', '')}` });
      onClear();
      onRefresh();
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: () => {
      toast({ title: 'Fout bij bulk update', variant: 'destructive' });
    },
    onSettled: () => {
      setIsProcessing(false);
      setConfirmAction(null);
    },
  });

  // Assign driver mutation
  const assignDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      setIsProcessing(true);
      const ids = Array.from(selectedIds);

      const { error } = await supabase
        .from('trips')
        .update({ driver_id: driverId })
        .in('id', ids);

      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      toast({ title: `Eigen chauffeur toegewezen aan ${count} orders` });
      onClear();
      onRefresh();
      setAssignDriverDialogOpen(false);
      setSelectedDriverId("");
    },
    onError: () => {
      toast({ title: 'Fout bij toewijzen', variant: 'destructive' });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Bulk invoice creation
  const invoiceMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const eligibleOrders = selectedOrders.filter(o => 
        (o.status === 'afgerond' || o.status === 'gecontroleerd') && o.customer_id && o.sales_total
      );

      if (eligibleOrders.length === 0) {
        throw new Error('Geen orders beschikbaar voor facturatie');
      }

      // Group by customer
      const byCustomer: Record<string, typeof eligibleOrders> = {};
      eligibleOrders.forEach(order => {
        if (order.customer_id) {
          if (!byCustomer[order.customer_id]) {
            byCustomer[order.customer_id] = [];
          }
          byCustomer[order.customer_id].push(order);
        }
      });

      // Fetch customer data for BTW calculation + payment terms
      const customerIds = Object.keys(byCustomer);
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, country, vat_number, payment_terms_days')
        .in('id', customerIds);
      const customerMap = new Map((customerData || []).map(c => [c.id, c]));

      // Fetch company country for BTW
      const companyIdFirst = eligibleOrders[0]?.id 
        ? (await supabase.from('trips').select('company_id').eq('id', eligibleOrders[0].id).single()).data?.company_id 
        : null;
      let companyCountry = 'NL';
      if (companyIdFirst) {
        const { data: compData } = await supabase.from('companies').select('country').eq('id', companyIdFirst).single();
        companyCountry = compData?.country || 'NL';
      }

      let createdCount = 0;

      for (const [customerId, customerOrders] of Object.entries(byCustomer)) {
        const customer = customerMap.get(customerId);
        const btw = berekenBTW({
          afzenderLand: companyCountry,
          ontvangerLand: customer?.country || null,
          ontvangerBTWnummer: customer?.vat_number || null,
        });

        const subtotal = customerOrders.reduce((sum, o) => sum + (o.sales_total || 0), 0);
        const vatPercentage = btw.tarief;
        const vatAmount = subtotal * (vatPercentage / 100);
        const total = subtotal + vatAmount;

        const companyId = customerOrders[0]?.id ? 
          (await supabase.from('trips').select('company_id').eq('id', customerOrders[0].id).single()).data?.company_id : null;
        if (!companyId) throw new Error('Geen bedrijf gevonden');
        const { data: invoiceNumber } = await supabase.rpc('get_next_invoice_number', { p_company_id: companyId });

        const paymentDays = customer?.payment_terms_days || 30;
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber as string,
            customer_id: customerId,
            company_id: companyId,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + paymentDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            subtotal,
            vat_percentage: vatPercentage,
            vat_amount: vatAmount,
            total_amount: total,
            status: 'concept',
            invoice_type: 'standaard',
            is_manual: false,
            vat_type: btw.type,
            vat_note: btw.factuurVermelding || null,
          } as any)
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        const lines = customerOrders.map(order => ({
          invoice_id: invoice.id,
          description: `Transport ${order.order_number || order.id.slice(0, 8)} - ${order.pickup_city || 'N/A'} - ${order.delivery_city || 'N/A'}`,
          quantity: 1,
          unit_price: order.sales_total || 0,
          total_price: order.sales_total || 0,
          trip_id: order.id,
          vat_percentage: vatPercentage,
          vat_amount: (order.sales_total || 0) * (vatPercentage / 100),
          line_type: 'trip',
          vat_type: btw.type,
        }));

        await supabase.from('invoice_lines').insert(lines);

        await supabase
          .from('trips')
          .update({ status: 'gefactureerd' satisfies TripStatus, invoice_id: invoice.id })
          .in('id', customerOrders.map(o => o.id));

        createdCount++;
      }

      return createdCount;
    },
    onSuccess: (count) => {
      toast({
        title: `${count} facturen aangemaakt`,
        action: (
          <ToastAction altText="Bekijk facturen" onClick={() => navigate('/invoices')}>
            Bekijk
          </ToastAction>
        ),
      });
      onClear();
      onRefresh();
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Fout bij aanmaken facturen', variant: 'destructive' });
    },
    onSettled: () => {
      setIsProcessing(false);
      setConfirmAction(null);
    },
  });

  // Bulk soft-delete with undo
  const deleteMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const ids = Array.from(selectedIds);

      const { error } = await supabase
        .from('trips')
        .update({ deleted_at: new Date().toISOString() } as any)
        .in('id', ids);

      if (error) throw error;
      return ids;
    },
    onSuccess: (deletedIds) => {
      toast({
        title: `${deletedIds.length} orders verwijderd`,
        action: (
          <ToastAction
            altText="Ongedaan maken"
            onClick={async () => {
              const { error } = await supabase
                .from('trips')
                .update({ deleted_at: null } as any)
                .in('id', deletedIds);
              if (!error) {
                toast({ title: `${deletedIds.length} orders hersteld` });
                onRefresh();
              }
            }}
          >
            Ongedaan maken
          </ToastAction>
        ),
        duration: 8000,
      });
      onClear();
      onRefresh();
    },
    onError: () => {
      toast({ title: 'Fout bij verwijderen', variant: 'destructive' });
    },
    onSettled: () => {
      setIsProcessing(false);
      setConfirmAction(null);
    },
  });

  // Bulk CMR print mutation
  const cmrPrintMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const eligibleOrders = selectedOrders.filter(o => o.order_number);
      
      if (eligibleOrders.length === 0) {
        throw new Error('Geen orders met ordernummer beschikbaar');
      }

      // Generate printable CMR content
      const cmrContent = eligibleOrders.map(order => `
        <div style="page-break-after: always; padding: 40px; font-family: Arial, sans-serif;">
          <div style="border: 2px solid #333; padding: 20px;">
            <h1 style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;">CMR VRACHTBRIEF</h1>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
              <div style="border: 1px solid #ccc; padding: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #666;">1. Afzender</h3>
                <p style="margin: 0;">${order.pickup_address || '-'}</p>
                <p style="margin: 0;">${order.pickup_city || '-'}</p>
              </div>
              <div style="border: 1px solid #ccc; padding: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #666;">2. Geadresseerde</h3>
                <p style="margin: 0;">${order.delivery_address || '-'}</p>
                <p style="margin: 0;">${order.delivery_city || '-'}</p>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px;">
              <div style="border: 1px solid #ccc; padding: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #666;">Ordernummer</h3>
                <p style="margin: 0; font-size: 18px; font-weight: bold;">${order.order_number}</p>
              </div>
              <div style="border: 1px solid #ccc; padding: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #666;">CMR Nr.</h3>
                <p style="margin: 0; font-size: 18px; font-weight: bold;">${order.cmr_number || order.waybill_number || '-'}</p>
              </div>
              <div style="border: 1px solid #ccc; padding: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #666;">Datum</h3>
                <p style="margin: 0; font-size: 18px;">${format(new Date(order.trip_date), 'dd-MM-yyyy')}</p>
              </div>
            </div>
            <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
              <div style="border-top: 1px solid #333; padding-top: 10px; text-align: center;">
                <p style="margin: 0; font-size: 12px;">Handtekening afzender</p>
              </div>
              <div style="border-top: 1px solid #333; padding-top: 10px; text-align: center;">
                <p style="margin: 0; font-size: 12px;">Handtekening charter</p>
              </div>
              <div style="border-top: 1px solid #333; padding-top: 10px; text-align: center;">
                <p style="margin: 0; font-size: 12px;">Handtekening ontvanger</p>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>CMR Vrachtbrieven - ${format(new Date(), 'dd-MM-yyyy')}</title>
            <style>
              @media print {
                body { margin: 0; }
                @page { size: A4; margin: 10mm; }
              }
            </style>
          </head>
          <body>
            ${cmrContent}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }

      return eligibleOrders.length;
    },
    onSuccess: (count) => {
      toast({ title: `${count} CMR vrachtbrieven voorbereid voor afdrukken` });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Fout bij CMR afdrukken', variant: 'destructive' });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Bulk send confirmation emails mutation
  const sendConfirmationMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const eligibleOrders = selectedOrders.filter(o => 
        o.customers?.email && o.order_number
      );

      if (eligibleOrders.length === 0) {
        throw new Error('Geen orders met klant e-mailadres beschikbaar');
      }

      let successCount = 0;
      let errorCount = 0;

      for (const order of eligibleOrders) {
        try {
          const response = await supabase.functions.invoke('send-order-confirmation', {
            body: {
              tripId: order.id,
              customerEmail: order.customers?.email,
              customerName: order.customers?.contact_name || order.customers?.company_name || 'Klant',
              orderNumber: order.order_number,
              pickupAddress: order.pickup_address || '-',
              pickupCity: order.pickup_city || '-',
              pickupDate: format(new Date(order.trip_date), 'dd-MM-yyyy'),
              pickupTimeWindow: null,
              deliveryAddress: order.delivery_address || '-',
              deliveryCity: order.delivery_city || '-',
              deliveryDate: null,
              deliveryTimeWindow: null,
              specialInstructions: null,
              language: 'nl',
            },
          });

          if (response.error) {
            console.error('Email error for order:', order.order_number, response.error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Email error for order:', order.order_number, error);
          errorCount++;
        }
      }

      return { successCount, errorCount };
    },
    onSuccess: ({ successCount, errorCount }) => {
      if (errorCount === 0) {
        toast({ title: `${successCount} bevestigingen verstuurd` });
      } else {
        toast({ 
          title: `${successCount} verstuurd, ${errorCount} mislukt`,
          variant: errorCount > successCount ? 'destructive' : 'default',
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Fout bij versturen bevestigingen', variant: 'destructive' });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Bulk send transport order mutation
  const sendTransportOrderMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const eligibleOrders = selectedOrders.filter(o => o.carrier_id && o.order_number);

      if (eligibleOrders.length === 0) {
        throw new Error('Geen orders met charter beschikbaar');
      }

      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const order of eligibleOrders) {
        try {
          // Get carrier email
          const { data: carrier } = await supabase
            .from('carriers')
            .select('email, company_name')
            .eq('id', order.carrier_id!)
            .single();

          if (!carrier?.email) {
            skippedCount++;
            continue;
          }

          // Generate PDF
          const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-document-pdf', {
            body: {
              orderId: order.id,
              documentType: 'transportopdracht',
              remark: transportOrderRemark,
            },
          });

          if (pdfError) { errorCount++; continue; }

          const documentUrl = pdfData?.url || pdfData?.publicUrl || '';
          if (!documentUrl) { errorCount++; continue; }

          // Send email
          const { error: emailError } = await supabase.functions.invoke('send-document-email', {
            body: {
              to: carrier.email,
              documentUrl,
              documentType: 'transportopdracht',
              orderNumber: order.order_number,
              recipientType: 'driver',
            },
          });

          if (emailError) { errorCount++; } else { successCount++; }
        } catch {
          errorCount++;
        }
      }

      return { successCount, errorCount, skippedCount };
    },
    onSuccess: ({ successCount, errorCount, skippedCount }) => {
      const parts: string[] = [];
      if (successCount > 0) parts.push(`${successCount} verstuurd`);
      if (skippedCount > 0) parts.push(`${skippedCount} overgeslagen (geen email)`);
      if (errorCount > 0) parts.push(`${errorCount} mislukt`);
      toast({ title: `Transportopdrachten: ${parts.join(', ')}` });
      onClear();
      onRefresh();
      setTransportOrderDialogOpen(false);
      setTransportOrderRemark('');
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Fout bij versturen', variant: 'destructive' });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Export function
  const handleExport = async () => {
    const exportData = selectedOrders.map(order => ({
      'Order Nr': order.order_number || '',
      'Datum': order.trip_date,
      'Klant': order.customers?.company_name || '',
      'Van': order.pickup_city || '',
      'Naar': order.delivery_city || '',
      'Status': order.status,
      'Verkoop': order.sales_total || 0,
      'Inkoop': order.purchase_total || 0,
      'Marge': (order.sales_total || 0) - (order.purchase_total || 0),
    }));

    await writeExcelFile(exportData, `orders_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`, 'Orders');
    toast({ title: `${count} orders geëxporteerd` });
  };

  const handleAction = (action: BulkAction) => {
    switch (action) {
      case 'assign_driver':
        setAssignDriverDialogOpen(true);
        break;
      case 'send_transport_order':
        setTransportOrderDialogOpen(true);
        break;
      case 'create_composite_route':
        setCompositeRouteDialogOpen(true);
        break;
      case 'export':
        handleExport();
        break;
      case 'print_cmr':
        cmrPrintMutation.mutate();
        break;
      case 'send_confirmation':
        setConfirmAction(action);
        break;
      default:
        setConfirmAction(action);
    }
  };

  const executeAction = () => {
    switch (confirmAction) {
      case 'status_offerte':
        statusMutation.mutate('offerte');
        break;
      case 'status_gepland':
        statusMutation.mutate('gepland');
        break;
      case 'status_onderweg':
        statusMutation.mutate('onderweg');
        break;
      case 'status_afgerond':
        statusMutation.mutate('afgerond');
        break;
      case 'status_gecontroleerd':
        statusMutation.mutate('gecontroleerd');
        break;
      case 'create_invoices':
        invoiceMutation.mutate();
        break;
      case 'delete':
        deleteMutation.mutate();
        break;
      case 'send_confirmation':
        sendConfirmationMutation.mutate();
        break;
    }
  };

  const getActionTitle = () => {
    switch (confirmAction) {
      case 'status_offerte': return 'Status wijzigen naar Offerte';
      case 'status_gepland': return 'Status wijzigen naar Gepland';
      case 'status_onderweg': return 'Status wijzigen naar Onderweg';
      case 'status_afgerond': return 'Status wijzigen naar Afgerond';
      case 'status_gecontroleerd': return 'Status wijzigen naar Gecontroleerd';
      case 'create_invoices': return 'Facturen aanmaken';
      case 'delete': return 'Orders verwijderen';
      case 'send_confirmation': return 'Bevestigingen versturen';
      default: return '';
    }
  };

  if (count === 0) return null;

  const formatCurrency = (v: number) =>
    v >= 1000 ? `€${(v / 1000).toFixed(1)}k` : `€${v.toFixed(0)}`;

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={cn(
              'flex items-center gap-1.5 pl-4 pr-2 py-2 rounded-2xl',
              'border border-border/20 bg-card/80 backdrop-blur-2xl',
              'shadow-[0_12px_48px_-8px_hsl(var(--foreground)/0.15),0_0_0_1px_hsl(var(--border)/0.1)]',
            )}>
              {/* Count + stats */}
              <div className="flex items-center gap-2 pr-2">
                <div className="flex items-center justify-center h-7 min-w-[28px] px-2 rounded-lg bg-primary/15 text-primary">
                  <span className="text-sm font-bold tabular-nums">{count}</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground whitespace-nowrap">
                  <span>{formatCurrency(stats.totalRevenue)}</span>
                  <span className="text-success">{formatCurrency(stats.totalProfit)}</span>
                </div>
              </div>

              <Divider />

              {/* Assign Driver */}
              {stats.needsDriver > 0 && (
                <>
                  <ActionBtn
                    icon={UserPlus}
                    label="Chauffeur"
                    tooltip={`${stats.needsDriver} zonder chauffeur`}
                    onClick={() => handleAction('assign_driver')}
                    className="text-warning hover:text-warning hover:bg-warning/10"
                  />
                  <Divider />
                </>
              )}

              {/* Status dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 h-9 px-3 rounded-xl font-medium transition-all duration-150 hover:bg-background/60 hover:shadow-sm"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span className="hidden md:inline text-xs">Status</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Status wijzigen</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="center" className="w-48">
                  <DropdownMenuItem onClick={() => handleAction('status_offerte')}>
                    <FileText className="h-4 w-4 mr-2 text-cyan-600" /> Offerte
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction('status_gepland')}>
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" /> Gepland
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction('status_onderweg')}>
                    <Truck className="h-4 w-4 mr-2 text-blue-500" /> Onderweg
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction('status_afgerond')}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Afgerond
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction('status_gecontroleerd')}>
                    <Shield className="h-4 w-4 mr-2 text-purple-500" /> Gecontroleerd
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Invoice */}
              <ActionBtn
                icon={FileText}
                label="Factureren"
                tooltip={stats.readyToInvoice > 0 ? `${stats.readyToInvoice} klaar voor facturatie` : 'Geen orders klaar'}
                onClick={() => handleAction('create_invoices')}
                disabled={stats.readyToInvoice === 0}
                badge={stats.readyToInvoice > 0 ? stats.readyToInvoice : undefined}
              />

              <Divider />

              {/* More actions */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 h-9 px-3 rounded-xl font-medium transition-all duration-150 hover:bg-background/60 hover:shadow-sm"
                      >
                        <Tag className="h-3.5 w-3.5" />
                        <span className="hidden md:inline text-xs">Meer</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Meer acties</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => handleAction('export')}>
                    <Download className="h-4 w-4 mr-2" /> Exporteren
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction('print_cmr')}>
                    <Printer className="h-4 w-4 mr-2" /> CMR afdrukken
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction('send_confirmation')}>
                    <Mail className="h-4 w-4 mr-2" /> Bevestiging sturen
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAction('send_transport_order')}>
                    <Send className="h-4 w-4 mr-2" /> Transportopdracht
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAction('create_composite_route')}>
                    <Route className="h-4 w-4 mr-2 text-primary" /> Samenvoegen tot route
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Divider />

              {/* Delete */}
              <ActionBtn
                icon={Trash2}
                label=""
                tooltip="Orders verwijderen"
                onClick={() => handleAction('delete')}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              />

              <Divider />

              {/* Close */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={onClear}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Selectie wissen</TooltipContent>
              </Tooltip>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Driver Dialog */}
      <Dialog open={assignDriverDialogOpen} onOpenChange={setAssignDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chauffeur toewijzen</DialogTitle>
            <DialogDescription>
              Wijs een chauffeur toe aan {count} geselecteerde orders.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="driver" className="text-sm font-medium">
              Chauffeur
            </Label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecteer eigen chauffeur" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDriverDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={() => assignDriverMutation.mutate(selectedDriverId)}
              disabled={!selectedDriverId || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Toewijzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'delete' 
                ? `Weet je zeker dat je ${count} orders wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`
                : confirmAction === 'create_invoices'
                ? `Er worden facturen aangemaakt voor ${stats.readyToInvoice} geselecteerde orders. Orders worden gegroepeerd per klant.`
                : confirmAction === 'send_confirmation'
                ? `Er worden orderbevestigingen per e-mail verstuurd naar de klanten van ${count} geselecteerde orders. Orders zonder klant e-mailadres worden overgeslagen.`
                : `De status van ${count} orders wordt gewijzigd.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={isProcessing}
              className={confirmAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmAction === 'delete' ? 'Verwijderen' : 'Bevestigen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transport Order Dialog */}
      <Dialog open={transportOrderDialogOpen} onOpenChange={setTransportOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Transportopdracht naar charter
            </DialogTitle>
            <DialogDescription>
              Verstuur de transportopdracht van {selectedOrders.filter(o => o.carrier_id).length} orders naar de toegewezen charters.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Opmerking (optioneel)</Label>
              <Textarea
                value={transportOrderRemark}
                onChange={(e) => setTransportOrderRemark(e.target.value)}
                placeholder="Eventuele opmerking bij de transportopdracht..."
                className="min-h-[80px] resize-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              De standaardinstellingen worden gehanteerd bij het versturen.
              Orders zonder charter of zonder e-mailadres worden overgeslagen.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransportOrderDialogOpen(false)} disabled={isProcessing}>
              Annuleren
            </Button>
            <Button onClick={() => sendTransportOrderMutation.mutate()} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Versturen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Composite Route Dialog */}
      <CreateCompositeRouteDialog
        open={compositeRouteDialogOpen}
        onOpenChange={setCompositeRouteDialogOpen}
        selectedOrders={selectedOrders}
        onSuccess={() => {
          onClear();
          onRefresh();
        }}
      />
    </>
  );
};

export default EnhancedBulkActionsBar;
