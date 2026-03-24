import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { useOrderTemplates } from '@/hooks/useOrderTemplates';
import { RecurringOrderDialog } from '@/components/orders/RecurringOrderDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, Plus, Repeat, Play, Pencil, Trash2, MoreVertical,
  Calendar, MapPin, Package,
} from 'lucide-react';

const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Dagelijks',
  weekly: 'Wekelijks',
  monthly: 'Maandelijks',
  once: 'Eenmalig',
};

const WEEKDAY_SHORT: Record<number, string> = {
  1: 'Ma', 2: 'Di', 3: 'Wo', 4: 'Do', 5: 'Vr', 6: 'Za', 7: 'Zo',
};

const RecurringOrders: React.FC = () => {
  const navigate = useNavigate();
  const { company } = useCompany();
  const isMobile = useIsMobile();
  const {
    templates, isLoading, toggleActive, deleteTemplate, createOrderFromTemplate,
  } = useOrderTemplates(company?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (template: any) => {
    setEditTemplate(template);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditTemplate(null);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTemplate.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const formatRecurrence = (t: any) => {
    const label = RECURRENCE_LABELS[t.recurrence_type] || t.recurrence_type;
    if (t.recurrence_type === 'weekly' && t.recurrence_days?.length) {
      return `${label} (${t.recurrence_days.map((d: number) => WEEKDAY_SHORT[d] || d).join(', ')})`;
    }
    if (t.recurrence_type === 'monthly' && t.recurrence_day_of_month) {
      return `${label} (dag ${t.recurrence_day_of_month})`;
    }
    return label;
  };

  const formatRoute = (t: any) => {
    const from = t.pickup_city || t.pickup_address || '—';
    const to = t.delivery_city || t.delivery_address || '—';
    return `${from} → ${to}`;
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Herhaalorders
            </h1>
            <p className="text-sm text-muted-foreground">
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={handleNew} size={isMobile ? 'icon' : 'default'}>
          <Plus className="h-4 w-4" />
          {!isMobile && <span className="ml-2">Nieuwe Template</span>}
        </Button>
      </div>

      {/* Empty state */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Repeat className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Geen herhaalorders</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Maak templates voor terugkerende orders zodat ze automatisch worden aangemaakt.
          </p>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Eerste Template Aanmaken
          </Button>
        </div>
      ) : isMobile ? (
        /* Mobile cards */
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="font-semibold truncate">{t.name}</div>
                  {t.customers?.company_name && (
                    <div className="text-sm text-muted-foreground truncate">{t.customers.company_name}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={t.is_active}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: t.id, isActive: checked })}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => createOrderFromTemplate.mutate(t.id)}>
                        <Play className="h-4 w-4 mr-2" /> Direct uitvoeren
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(t)}>
                        <Pencil className="h-4 w-4 mr-2" /> Bewerken
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteId(t.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Verwijderen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatRecurrence(t)}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {formatRoute(t)}
                </Badge>
              </div>

              {t.next_run_date && (
                <div className="text-xs text-muted-foreground">
                  Volgende: {t.next_run_date}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Desktop table */
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Herhaling</TableHead>
                <TableHead>Volgende run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} className={!t.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.customers?.company_name || '—'}</TableCell>
                  <TableCell className="text-sm">{formatRoute(t)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatRecurrence(t)}</Badge>
                  </TableCell>
                  <TableCell>{t.next_run_date || '—'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: t.id, isActive: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        title="Direct uitvoeren"
                        onClick={() => createOrderFromTemplate.mutate(t.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        title="Bewerken"
                        onClick={() => handleEdit(t)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        title="Verwijderen"
                        onClick={() => setDeleteId(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <RecurringOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editTemplate}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Template verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwijdert de herhaalorder template permanent. Bestaande orders blijven behouden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecurringOrders;
