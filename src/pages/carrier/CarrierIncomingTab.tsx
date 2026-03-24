import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Package,
  Euro,
  Loader2,
  Inbox,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useIntercompanyDispatch, IntercompanyDispatch } from '@/hooks/useIntercompanyDispatch';

const CarrierIncomingTab = () => {
  const { incomingDispatches, loading, acceptDispatch, declineDispatch, refetchIncoming } =
    useIntercompanyDispatch();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [declineReasonId, setDeclineReasonId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pendingDispatches = incomingDispatches.filter(d => d.status === 'pending');
  const activeDispatches = incomingDispatches.filter(d => ['accepted', 'in_progress'].includes(d.status));

  const handleAccept = async (dispatch: IntercompanyDispatch) => {
    setActionLoading(dispatch.id);
    await acceptDispatch(dispatch.id);
    refetchIncoming();
    setActionLoading(null);
  };

  const handleDeclineConfirm = async (dispatchId: string) => {
    setActionLoading(dispatchId);
    await declineDispatch(dispatchId, declineReason || undefined);
    setDeclineReasonId(null);
    setDeclineReason('');
    refetchIncoming();
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderDispatchCard = (dispatch: IntercompanyDispatch, showActions: boolean) => {
    const order = dispatch.primary_order;
    const isExpanded = expandedId === dispatch.id;
    const isDeclining = declineReasonId === dispatch.id;
    const isActing = actionLoading === dispatch.id;

    const statusColors: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };
    const statusLabels: Record<string, string> = {
      pending: 'Wacht op reactie',
      accepted: 'Geaccepteerd',
      in_progress: 'In uitvoering',
    };

    return (
      <Card key={dispatch.id} className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header row */}
          <button
            className="w-full text-left p-4 flex items-start justify-between gap-3"
            onClick={() => setExpandedId(isExpanded ? null : dispatch.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={statusColors[dispatch.status] || ''}>
                  {statusLabels[dispatch.status] || dispatch.status}
                </Badge>
                {dispatch.agreed_price && (
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <Euro className="h-3.5 w-3.5" />
                    {Number(dispatch.agreed_price).toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Van: <span className="font-medium text-foreground">{dispatch.from_company?.name || 'Onbekend'}</span>
              </p>
              {order?.trip_date && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(order.trip_date), 'd MMM yyyy', { locale: nl })}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 mt-1">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Expanded details */}
          {isExpanded && order && (
            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
              {/* Route */}
              <div className="space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ophalen</p>
                    <p className="text-sm font-medium">{order.pickup_address}</p>
                    {order.pickup_city && <p className="text-xs text-muted-foreground">{order.pickup_city}</p>}
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Afleveren</p>
                    <p className="text-sm font-medium">{order.delivery_address}</p>
                    {order.delivery_city && <p className="text-xs text-muted-foreground">{order.delivery_city}</p>}
                  </div>
                </div>
              </div>

              {/* Cargo */}
              {order.cargo_description && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  <span>{order.cargo_description}</span>
                </div>
              )}

              {/* Notes */}
              {dispatch.dispatch_notes && (
                <div className="p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
                  {dispatch.dispatch_notes}
                </div>
              )}

              {/* Decline reason input */}
              {isDeclining && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Reden voor afwijzing (optioneel)"
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeclineConfirm(dispatch.id)}
                      disabled={isActing}
                      className="flex-1"
                    >
                      {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Bevestig afwijzing'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeclineReasonId(null)}
                      disabled={isActing}
                    >
                      Annuleer
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons for pending dispatches */}
              {showActions && dispatch.status === 'pending' && !isDeclining && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAccept(dispatch)}
                    disabled={isActing}
                  >
                    {isActing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Accepteren
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeclineReasonId(dispatch.id)}
                    disabled={isActing}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Afwijzen
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Pending */}
      {pendingDispatches.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            Wacht op reactie ({pendingDispatches.length})
          </h3>
          <div className="space-y-3">
            {pendingDispatches.map(d => renderDispatchCard(d, true))}
          </div>
        </section>
      )}

      {/* Active */}
      {activeDispatches.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Actieve opdrachten ({activeDispatches.length})
          </h3>
          <div className="space-y-3">
            {activeDispatches.map(d => renderDispatchCard(d, false))}
          </div>
        </section>
      )}

      {/* Empty */}
      {pendingDispatches.length === 0 && activeDispatches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Geen inkomende opdrachten</p>
            <p className="text-sm text-muted-foreground mt-1">
              Opdrachten van opdrachtgevers verschijnen hier.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierIncomingTab;
