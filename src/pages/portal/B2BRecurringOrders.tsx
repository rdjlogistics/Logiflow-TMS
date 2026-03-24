import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, Plus, Play, Pause, Trash2, Loader2, Calendar, MapPin, Package, Edit2 } from 'lucide-react';
import B2BLayout from '@/components/portal/b2b/B2BLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { usePortalOrderTemplates, type PortalOrderTemplate } from '@/hooks/usePortalOrderTemplates';
import { useCreateSubmission } from '@/hooks/usePortalShipments';
import { PortalRecurringOrderDialog } from '@/components/portal/b2b/PortalRecurringOrderDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const RECURRENCE_LABELS: Record<string, string> = {
  once: 'Eenmalig',
  daily: 'Dagelijks',
  weekly: 'Wekelijks',
  monthly: 'Maandelijks',
};

const DAY_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

const B2BRecurringOrders = () => {
  const { customerId, customer } = usePortalAuth();
  const { templates, loading, fetchTemplates, toggleActive, deleteTemplate } = usePortalOrderTemplates(customerId || undefined);
  const { createSubmission } = useCreateSubmission();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    if (customerId) {
      fetchTemplates();
      supabase.from('customers').select('tenant_id').eq('id', customerId).single().then(({ data }) => {
        if (data?.tenant_id) setTenantId(data.tenant_id);
      });
    }
  }, [customerId, fetchTemplates]);

  const handleExecute = async (template: PortalOrderTemplate) => {
    if (!customerId) return;
    setExecutingId(template.id);
    try {
      const result = await createSubmission({
        pickupCompany: 'Ophaaladres',
        pickupAddress: template.pickup_address || 'Onbekend',
        pickupPostalCode: template.pickup_postal_code || '',
        pickupCity: template.pickup_city || 'Onbekend',
        deliveryCompany: 'Afleveradres',
        deliveryAddress: template.delivery_address || 'Onbekend',
        deliveryPostalCode: template.delivery_postal_code || '',
        deliveryCity: template.delivery_city || 'Onbekend',
        productDescription: template.cargo_description || 'Herhaalorder',
        weightKg: template.weight_kg || undefined,
        pickupDate: new Date().toISOString().split('T')[0],
        referenceNumber: `RPT-${template.name.slice(0, 10)}`,
      }, customerId);
      toast.success('Order aangemaakt vanuit herhaalorder!', {
        description: `Ordernummer: ${result?.orderNumber || ''}`,
        action: {
          label: "Bekijk zending",
          onClick: () => window.location.href = '/portal/b2b/shipments',
        },
        duration: 8000,
      });
    } catch {
      toast.error('Kon order niet aanmaken');
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTemplate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <B2BLayout companyName={customer?.companyName || 'Klantenportaal'}>
      <div className="max-w-4xl mx-auto pb-24 sm:pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
              <Repeat className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Herhaalorders
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automatiseer terugkerende zendingen
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="touch-manipulation active:scale-[0.97]">
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Herhaalorder
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty */}
        {!loading && templates.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 rounded-xl border border-dashed border-border/50 bg-card/40 backdrop-blur-sm"
          >
            <Repeat className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold mb-1">Nog geen herhaalorders</h3>
            <p className="text-sm text-muted-foreground mb-4">Maak templates van terugkerende zendingen</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Eerste Herhaalorder
            </Button>
          </motion.div>
        )}

        {/* Templates List */}
        {!loading && templates.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence>
              {templates.map((template, i) => (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "group rounded-xl border bg-card/80 backdrop-blur-sm p-4 transition-all",
                    template.is_active ? "border-primary/30" : "border-border/50 opacity-70"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate">{template.name}</h3>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {RECURRENCE_LABELS[template.recurrence_type || 'once'] || 'Eenmalig'}
                        </Badge>
                        {template.is_active && (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0">
                            Actief
                          </Badge>
                        )}
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {template.pickup_city || 'Ophalen'} → {template.delivery_city || 'Afleveren'}
                        </span>
                      </div>

                      {/* Schedule details */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {template.recurrence_type === 'weekly' && template.recurrence_days && (
                          <div className="flex gap-1">
                            {template.recurrence_days.map(d => (
                              <span key={d} className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium">
                                {DAY_LABELS[d]}
                              </span>
                            ))}
                          </div>
                        )}
                        {template.recurrence_type === 'monthly' && template.recurrence_day_of_month && (
                          <span className="text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Elke {template.recurrence_day_of_month}e van de maand
                          </span>
                        )}
                        {template.next_run_date && (
                          <span className="text-xs text-muted-foreground">
                            Volgende: {new Date(template.next_run_date).toLocaleDateString('nl-NL')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 touch-manipulation active:scale-[0.97]"
                        onClick={() => handleExecute(template)}
                        disabled={executingId === template.id}
                      >
                        {executingId === template.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1" />
                            Nu uitvoeren
                          </>
                        )}
                      </Button>
                      <Switch
                        checked={!!template.is_active}
                        onCheckedChange={() => toggleActive(template.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(template.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Create Dialog */}
        <PortalRecurringOrderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          customerId={customerId || ''}
          tenantId={tenantId}
          onCreated={fetchTemplates}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-card/95 backdrop-blur-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Herhaalorder verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Deze herhaalorder wordt permanent verwijderd.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </B2BLayout>
  );
};

export default B2BRecurringOrders;
