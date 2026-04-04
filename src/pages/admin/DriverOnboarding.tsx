import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  User,
  FileText,
  CreditCard,
  Car,
  ShieldCheck,
  GraduationCap,
  ClipboardSignature,
  Mail,
  UserPlus
} from 'lucide-react';
import { useDriverOnboarding, DriverOnboarding as DriverOnboardingType } from '@/hooks/useDriverOnboarding';
import { DriverDocumentVerificationCard } from '@/components/admin/DriverDocumentVerificationCard';
import { CreateDriverPortalDialog } from '@/components/drivers/CreateDriverPortalDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { AvatarImage } from '@/components/ui/avatar';

type OnboardingStatus = 'in_progress' | 'pending_review' | 'approved' | 'rejected';

const ONBOARDING_STEPS = [
  { key: 'step_personal_info', label: 'Persoonlijke Gegevens', icon: User },
  { key: 'step_documents_uploaded', label: 'Documenten Geüpload', icon: FileText },
  { key: 'step_bank_details', label: 'Bankgegevens', icon: CreditCard },
  { key: 'step_vehicle_assigned', label: 'Voertuig Toegewezen', icon: Car },
  { key: 'step_compliance_verified', label: 'Compliance Geverifieerd', icon: ShieldCheck },
  { key: 'step_training_completed', label: 'Training Voltooid', icon: GraduationCap },
  { key: 'step_contract_signed', label: 'Contract Getekend', icon: ClipboardSignature },
];

const STATUS_CONFIG: Record<OnboardingStatus, { label: string; color: string; icon: typeof Clock }> = {
  in_progress: { label: 'In Behandeling', color: 'bg-blue-500', icon: Clock },
  pending_review: { label: 'Wacht op Review', color: 'bg-amber-500', icon: AlertTriangle },
  approved: { label: 'Goedgekeurd', color: 'bg-green-500', icon: CheckCircle2 },
  rejected: { label: 'Afgewezen', color: 'bg-red-500', icon: ThumbsDown },
};

const DriverOnboarding = () => {
  const { onboardings, isLoading, approveOnboarding, rejectOnboarding, updateStep } = useDriverOnboarding();
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  
  const [portalDialogDriver, setPortalDialogDriver] = useState<{ id: string; name: string; email: string | null } | null>(null);
  const { company } = useCompany();

  // Fetch driver details for all onboarding records
  const driverIds = onboardings.map(o => o.driver_id);
  const { data: driversMap = {} } = useQuery({
    queryKey: ['onboarding-drivers', driverIds],
    queryFn: async () => {
      if (driverIds.length === 0) return {};
      const { data } = await supabase
        .from('drivers')
        .select('id, name, email, profile_photo_url, user_id')
        .in('id', driverIds);
      if (!data) return {};
      const map: Record<string, { name: string; email: string | null; profile_photo_url: string | null; user_id: string | null }> = {};
      data.forEach(d => { map[d.id] = d; });
      return map;
    },
    enabled: driverIds.length > 0,
  });
  const [statusFilter, setStatusFilter] = useState<OnboardingStatus | 'all'>('all');
  const [selectedOnboarding, setSelectedOnboarding] = useState<DriverOnboardingType | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const filteredOnboardings = onboardings.filter(o => {
    const driver = driversMap[o.driver_id];
    const driverName = driver?.name || o.driver_id;
    const driverEmail = driver?.email || '';
    const matchesSearch = driverName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          driverEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.driver_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProgress = (onboarding: DriverOnboardingType) => {
    const steps = ONBOARDING_STEPS.map(s => onboarding[s.key as keyof DriverOnboardingType]);
    const completed = steps.filter(Boolean).length;
    return Math.round((completed / steps.length) * 100);
  };

  const handleApprove = async (onboarding: DriverOnboardingType) => {
    approveOnboarding.mutate({ onboardingId: onboarding.id });
    setSelectedOnboarding(null);
  };

  const handleReject = async () => {
    if (selectedOnboarding) {
      rejectOnboarding.mutate({ onboardingId: selectedOnboarding.id, notes: rejectReason });
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedOnboarding(null);
    }
  };

  const handleStepToggle = async (onboarding: DriverOnboardingType, stepKey: string) => {
    const currentValue = onboarding[stepKey as keyof DriverOnboardingType] as boolean;
    updateStep.mutate({ onboardingId: onboarding.id, step: stepKey as keyof DriverOnboardingType, completed: !currentValue });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Chauffeur Onboarding">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const stats = {
    total: onboardings.length,
    inProgress: onboardings.filter(o => o.status === 'in_progress').length,
    pendingReview: onboardings.filter(o => o.status === 'pending_review').length,
    approved: onboardings.filter(o => o.status === 'approved').length,
  };

  return (
    <DashboardLayout title="Chauffeur Onboarding" description="Beheer het onboarding proces van nieuwe chauffeurs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>Chauffeur Onboarding</span>
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Totaal', value: stats.total, color: 'text-primary' },
            { label: 'In Behandeling', value: stats.inProgress, color: 'text-blue-500' },
            { label: 'Wacht op Review', value: stats.pendingReview, color: 'text-amber-500' },
            { label: 'Goedgekeurd', value: stats.approved, color: 'text-green-500' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-sm ${stat.color}`}>{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op naam of e-mail..."
              className="pl-10"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as OnboardingStatus | 'all')}>
            <TabsList>
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="pending_review" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Review
              </TabsTrigger>
              <TabsTrigger value="in_progress">In Behandeling</TabsTrigger>
              <TabsTrigger value="approved">Goedgekeurd</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Onboarding List */}
        <div className="space-y-4">
            {filteredOnboardings.map((onboarding) => {
              const progress = getProgress(onboarding);
              const statusConfig = STATUS_CONFIG[onboarding.status];
              const driver = driversMap[onboarding.driver_id];
              const driverName = driver?.name || `Chauffeur #${onboarding.driver_id.slice(0, 8)}`;
              const driverInitials = driverName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              
              return (
                <div
                  key={onboarding.id}

                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Driver Info */}
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            {driver?.profile_photo_url && (
                              <AvatarImage src={driver.profile_photo_url} alt={driverName} />
                            )}
                            <AvatarFallback>{driverInitials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{driverName}</p>
                            {driver?.email && (
                              <p className="text-sm text-muted-foreground">{driver.email}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Gestart: {new Date(onboarding.created_at).toLocaleDateString('nl-NL')}
                            </p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="flex-1 max-w-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Voortgang</span>
                            <span className="text-sm font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex gap-1 mt-2">
                            {ONBOARDING_STEPS.map((step) => {
                              const completed = onboarding[step.key as keyof DriverOnboardingType] as boolean;
                              return (
                                <div
                                  key={step.key}
                                  className={`h-1.5 flex-1 rounded-full ${completed ? 'bg-green-500' : 'bg-muted'}`}
                                  title={step.label}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${statusConfig.color} text-white gap-1`}>
                            <statusConfig.icon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOnboarding(onboarding)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </Button>
                          {/* Portal account actions */}
                          {onboarding.status === 'approved' && !driver?.user_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => setPortalDialogDriver({
                                id: onboarding.driver_id,
                                name: driverName,
                                email: driver?.email || null,
                              })}
                            >
                              <Mail className="h-4 w-4" />
                              Verstuur inloggegevens
                            </Button>
                          )}
                          {onboarding.status !== 'approved' && !driver?.user_id && onboarding.status !== 'rejected' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-muted-foreground"
                              onClick={() => setPortalDialogDriver({
                                id: onboarding.driver_id,
                                name: driverName,
                                email: driver?.email || null,
                              })}
                            >
                              <UserPlus className="h-4 w-4" />
                              Koppel portaal
                            </Button>
                          )}
                          {driver?.user_id && (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                              <CheckCircle2 className="h-3 w-3" />
                              Portaal actief
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          {filteredOnboardings.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Geen onboardings gevonden</h3>
                <p className="text-muted-foreground">
                  Er zijn momenteel geen chauffeurs in het onboarding proces
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selectedOnboarding} onOpenChange={() => setSelectedOnboarding(null)}>
          <DialogContent className="max-w-2xl">
            {selectedOnboarding && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {driversMap[selectedOnboarding.driver_id]?.name || `Chauffeur #${selectedOnboarding.driver_id.slice(0, 8)}`}
                  </DialogTitle>
                  <DialogDescription>
                    {driversMap[selectedOnboarding.driver_id]?.email || 'Onboarding details'}
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="steps" className="py-4">
                  <TabsList className="mb-4">
                    <TabsTrigger value="steps">Onboarding Stappen</TabsTrigger>
                    <TabsTrigger value="documents">Documenten Verificatie</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="steps">
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-6">
                        {/* Steps Checklist */}
                        <div className="space-y-3">
                          {ONBOARDING_STEPS.map((step) => {
                            const completed = selectedOnboarding[step.key as keyof DriverOnboardingType] as boolean;
                            return (
                              <div
                                key={step.key}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  completed ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border hover:bg-muted/50'
                                }`}
                                onClick={() => handleStepToggle(selectedOnboarding, step.key)}
                              >
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  completed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                  {completed ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                                </div>
                                <span className={completed ? 'font-medium text-green-700' : ''}>
                                  {step.label}
                                </span>
                                {completed && (
                                  <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                                    Voltooid
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Notes */}
                        {selectedOnboarding.notes && (
                          <div className="space-y-2">
                            <h4 className="font-medium">Notities</h4>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                              {selectedOnboarding.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="documents">
                    <ScrollArea className="h-[400px] pr-4">
                      <DriverDocumentVerificationCard driverId={selectedOnboarding.driver_id} />
                    </ScrollArea>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  {selectedOnboarding.status === 'pending_review' && (
                    <>
                      <Button
                        variant="outline"
                        className="text-destructive gap-2"
                        onClick={() => setShowRejectDialog(true)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        Afwijzen
                      </Button>
                      <Button
                        className="gap-2 bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(selectedOnboarding)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Goedkeuren
                      </Button>
                    </>
                  )}
                  {selectedOnboarding.status !== 'pending_review' && (
                    <Button variant="outline" onClick={() => setSelectedOnboarding(null)}>
                      Sluiten
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onboarding Afwijzen</DialogTitle>
              <DialogDescription>
                Geef een reden op waarom de onboarding wordt afgewezen
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reden voor afwijzing..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Annuleren
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>
                Afwijzen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Portal Account Dialog */}
        {portalDialogDriver && (
          <CreateDriverPortalDialog
            open={!!portalDialogDriver}
            onOpenChange={(open) => !open && setPortalDialogDriver(null)}
            driverId={portalDialogDriver.id}
            driverName={portalDialogDriver.name}
            driverEmail={portalDialogDriver.email}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['onboarding-drivers'] });
              queryClient.invalidateQueries({ queryKey: ['driver-onboarding'] });
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default DriverOnboarding;
