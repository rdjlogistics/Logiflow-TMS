import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, Clock, CheckCircle, XCircle, Gift, 
  PartyPopper, Heart, AlertTriangle, Trophy, RefreshCcw,
  CreditCard, Play, Pause
} from "lucide-react";
import { useRelationshipVault, MomentType, MomentStatus } from "@/hooks/useRelationshipVault";
import { SendGiftDialog } from "@/components/crm/SendGiftDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const momentTypeConfig: Record<MomentType, { label: string; icon: React.ReactNode; color: string }> = {
  ONBOARDING: { label: 'Onboarding', icon: <PartyPopper className="h-4 w-4" />, color: 'text-emerald-500 bg-emerald-500/10' },
  MILESTONE: { label: 'Mijlpaal', icon: <Trophy className="h-4 w-4" />, color: 'text-amber-500 bg-amber-500/10' },
  APOLOGY: { label: 'Excuses', icon: <Heart className="h-4 w-4" />, color: 'text-rose-500 bg-rose-500/10' },
  JUBILEE: { label: 'Jubileum', icon: <PartyPopper className="h-4 w-4" />, color: 'text-violet-500 bg-violet-500/10' },
  RETENTION: { label: 'Retentie', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-500 bg-orange-500/10' },
  PAYMENT_RECOVERY: { label: 'Betalingsherstel', icon: <CreditCard className="h-4 w-4" />, color: 'text-blue-500 bg-blue-500/10' },
};

const statusConfig: Record<MomentStatus, { label: string; color: string }> = {
  SUGGESTED: { label: 'Gesuggereerd', color: 'bg-amber-500/10 text-amber-500' },
  PLANNED: { label: 'Gepland', color: 'bg-blue-500/10 text-blue-500' },
  DONE: { label: 'Voltooid', color: 'bg-emerald-500/10 text-emerald-500' },
  SKIPPED: { label: 'Overgeslagen', color: 'bg-muted text-muted-foreground' },
};

const MomentsEngine = () => {
  const [statusFilter, setStatusFilter] = useState<string>("SUGGESTED");
  const [scanning, setScanning] = useState(false);
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  const { 
    moments, 
    momentsLoading, 
    updateMomentStatus,
  } = useRelationshipVault();

  // Get customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-moments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name');
      if (error) throw error;
      return data;
    },
  });

  const getCustomerName = (accountId: string) => 
    customers.find(c => c.id === accountId)?.company_name || 'Onbekend';

  const filteredMoments = moments.filter(m => 
    statusFilter === "all" || m.status === statusFilter
  );

  const handleStatusChange = async (momentId: string, newStatus: MomentStatus) => {
    await updateMomentStatus.mutateAsync({ id: momentId, status: newStatus });
  };

  const handleScanEvents = async () => {
    setScanning(true);
    toast({ title: "Events scannen", description: "Klantactiviteit wordt gescand voor nieuwe momenten..." });
    
    try {
      await refetchMoments();
      toast({ title: "Scan voltooid", description: `${moments?.length || 0} momenten gevonden in het systeem.` });
    } finally {
      setScanning(false);
    }
  };

  const handleOpenGiftDialog = (momentId: string, accountId: string) => {
    setSelectedMoment(momentId);
    setSelectedCustomerId(accountId);
    setGiftDialogOpen(true);
  };

  const handleGiftSent = async () => {
    if (selectedMoment) {
      await handleStatusChange(selectedMoment, 'DONE');
    }
    setGiftDialogOpen(false);
    setSelectedMoment(null);
    setSelectedCustomerId(null);
  };

  return (
    <DashboardLayout title="Moments Engine">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-amber-500" />
              Moments Engine
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-gesuggereerde momenten voor klantbinding
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleScanEvents} disabled={scanning}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scannen...' : 'Scan Events'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gesuggereerd</p>
                  <p className="text-2xl font-bold text-amber-500">
                    {moments.filter(m => m.status === 'SUGGESTED').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gepland</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {moments.filter(m => m.status === 'PLANNED').length}
                  </p>
                </div>
                <Play className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Voltooid</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {moments.filter(m => m.status === 'DONE').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overgeslagen</p>
                  <p className="text-2xl font-bold">
                    {moments.filter(m => m.status === 'SKIPPED').length}
                  </p>
                </div>
                <Pause className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="SUGGESTED">Gesuggereerd</TabsTrigger>
            <TabsTrigger value="PLANNED">Gepland</TabsTrigger>
            <TabsTrigger value="DONE">Voltooid</TabsTrigger>
            <TabsTrigger value="all">Alles</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Moments List */}
        <div className="space-y-3">
          {momentsLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Laden...
              </CardContent>
            </Card>
          ) : filteredMoments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>Geen momenten gevonden</p>
                <p className="text-sm mt-2">Momenten worden automatisch gesuggereerd op basis van klantactiviteit</p>
              </CardContent>
            </Card>
          ) : (
            filteredMoments.map((moment) => {
              const typeConfig = momentTypeConfig[moment.type];
              return (
                <Card key={moment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                          {typeConfig.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {typeConfig.label}
                            </h3>
                            <Badge variant="outline" className={statusConfig[moment.status].color}>
                              {statusConfig[moment.status].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getCustomerName(moment.account_id)} • {formatDistanceToNow(new Date(moment.created_at), { addSuffix: true, locale: nl })}
                          </p>
                          {moment.trigger_event_key && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Trigger: {moment.trigger_event_key}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {moment.status === 'SUGGESTED' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStatusChange(moment.id, 'PLANNED')}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Plan
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleStatusChange(moment.id, 'SKIPPED')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {moment.status === 'PLANNED' && (
                          <>
                            <Button 
                              size="sm"
                              onClick={() => handleStatusChange(moment.id, 'DONE')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Voltooid
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenGiftDialog(moment.id, moment.account_id)}
                            >
                              <Gift className="h-4 w-4 mr-1" />
                              Stuur Cadeau
                            </Button>
                          </>
                        )}
                        {moment.status === 'DONE' && moment.done_at && (
                          <span className="text-sm text-muted-foreground">
                            Voltooid op {format(new Date(moment.done_at), 'd MMM yyyy', { locale: nl })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Suggested Actions */}
                    {moment.status !== 'DONE' && moment.status !== 'SKIPPED' && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          AI Suggesties
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary">Persoonlijk bericht sturen</Badge>
                          <Badge variant="secondary">Bloemen bestellen</Badge>
                          <Badge variant="secondary">Telefonisch contact</Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Send Gift Dialog */}
      <SendGiftDialog
        open={giftDialogOpen}
        onOpenChange={setGiftDialogOpen}
        customerName={selectedCustomerId ? getCustomerName(selectedCustomerId) : 'Klant'}
        onSuccess={handleGiftSent}
      />
    </DashboardLayout>
  );
};

export default MomentsEngine;
