import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus, 
  Search, 
  FileSignature,
  MoreVertical,
  Send,
  Eye,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  ShieldAlert,
  Users,
  Truck,
  Building2,
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useContractManagement, ContractDocument, ContractEvent } from '@/hooks/useContractManagement';
import { CreateContractDialog } from '@/components/contracts/CreateContractDialog';
import { ContractDetailDialog } from '@/components/contracts/ContractDetailDialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ContractManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();
  const {
    contracts,
    isLoading,
    createContract,
    isCreating,
    sendContract,
    isSending,
    voidContract,
    resendContract,
    isResending,
    fetchContractEvents,
    stats,
  } = useContractManagement();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [contractToVoid, setContractToVoid] = useState<ContractDocument | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractDocument | null>(null);
  const [contractEvents, setContractEvents] = useState<ContractEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const handleViewContract = useCallback(async (contract: ContractDocument) => {
    setSelectedContract(contract);
    setDetailDialogOpen(true);
    setLoadingEvents(true);
    
    try {
      const events = await fetchContractEvents(contract.id);
      setContractEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  }, [fetchContractEvents]);

  useEffect(() => {
    if (!roleLoading && role !== 'admin' && role !== 'medewerker') {
      toast({
        title: 'Geen toegang',
        description: 'Je hebt geen rechten om deze pagina te bekijken.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [role, roleLoading, navigate, toast]);

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.counterparty_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'draft') return matchesSearch && contract.status === 'draft';
    if (activeTab === 'pending') return matchesSearch && ['sent', 'viewed'].includes(contract.status);
    if (activeTab === 'completed') return matchesSearch && contract.status === 'completed';
    if (activeTab === 'declined') return matchesSearch && ['declined', 'expired'].includes(contract.status);
    
    return matchesSearch;
  });

  const getStatusBadge = (contract: ContractDocument) => {
    const status = contract.status;
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Concept</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30"><Send className="h-3 w-3 mr-1" />Verzonden</Badge>;
      case 'viewed':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30"><Eye className="h-3 w-3 mr-1" />Bekeken</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Ondertekend</Badge>;
      case 'declined':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Afgewezen</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500/30"><AlertCircle className="h-3 w-3 mr-1" />Verlopen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case 'driver': return Truck;
      case 'customer': return Users;
      case 'carrier': return Building2;
      default: return Users;
    }
  };

  const handleVoidClick = (contract: ContractDocument) => {
    setContractToVoid(contract);
    setVoidDialogOpen(true);
  };

  const confirmVoid = () => {
    if (contractToVoid) {
      voidContract({ contractId: contractToVoid.id, reason: 'Geannuleerd door gebruiker' });
      setVoidDialogOpen(false);
      setContractToVoid(null);
    }
  };

  if (roleLoading || isLoading) {
    return (
      <DashboardLayout title="Contractbeheer">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (role !== 'admin' && role !== 'medewerker') {
    return (
      <DashboardLayout title="Contractbeheer">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold">Geen toegang</h2>
          <p className="text-muted-foreground">Je hebt geen rechten om deze pagina te bekijken.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Contractbeheer" description="Beheer contracten en ondertekeningen">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="icon-gradient">
              <FileSignature className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Contractbeheer
              </h1>
              <p className="text-muted-foreground text-sm hidden sm:block">
                Beheer contracten en volg ondertekeningen
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="btn-premium">
            <Plus className="h-4 w-4 mr-2" />
            Nieuw contract
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Totaal</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-blue-600">{stats.sent + stats.viewed}</p>
            <p className="text-sm text-muted-foreground">In afwachting</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Ondertekend</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
            <p className="text-sm text-muted-foreground">Concept</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
            <p className="text-sm text-muted-foreground">Afgewezen</p>
          </Card>
        </div>

        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Alles</TabsTrigger>
              <TabsTrigger value="pending">In afwachting</TabsTrigger>
              <TabsTrigger value="completed">Ondertekend</TabsTrigger>
              <TabsTrigger value="draft">Concept</TabsTrigger>
              <TabsTrigger value="declined">Afgewezen</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Contract List */}
        {filteredContracts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileSignature className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Geen contracten gevonden</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Geen resultaten voor je zoekopdracht.' : 'Maak je eerste contract aan.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuw contract
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map((contract) => {
              const RecipientIcon = getRecipientIcon(contract.counterparty_type);
              return (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          contract.status === 'completed' ? "bg-green-500/20" :
                          contract.status === 'declined' ? "bg-red-500/20" :
                          ['sent', 'viewed'].includes(contract.status) ? "bg-blue-500/20" :
                          "bg-muted"
                        )}>
                          <FileSignature className={cn(
                            "h-5 w-5",
                            contract.status === 'completed' ? "text-green-600" :
                            contract.status === 'declined' ? "text-red-600" :
                            ['sent', 'viewed'].includes(contract.status) ? "text-blue-600" :
                            "text-muted-foreground"
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{contract.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <RecipientIcon className="h-3.5 w-3.5" />
                            <span className="truncate">{contract.counterparty_name}</span>
                            <span>•</span>
                            <span>{format(new Date(contract.created_at), 'd MMM yyyy', { locale: nl })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(contract)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewContract(contract)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Bekijken
                            </DropdownMenuItem>
                            {contract.status === 'draft' && (
                              <DropdownMenuItem onClick={() => sendContract(contract.id)}>
                                <Send className="h-4 w-4 mr-2" />
                                Verzenden
                              </DropdownMenuItem>
                            )}
                            {['sent', 'viewed'].includes(contract.status) && (
                              <DropdownMenuItem onClick={() => resendContract(contract.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Herinnering
                              </DropdownMenuItem>
                            )}
                            {!['completed', 'declined', 'expired'].includes(contract.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleVoidClick(contract)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Annuleren
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Contract Dialog */}
      <CreateContractDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createContract}
        isSubmitting={isCreating}
      />

      {/* Contract Detail Dialog */}
      <ContractDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        contract={selectedContract}
        events={contractEvents}
        isLoadingEvents={loadingEvents}
        onSend={sendContract}
        onResend={resendContract}
        onVoid={(id) => {
          const contract = contracts.find(c => c.id === id);
          if (contract) {
            setContractToVoid(contract);
            setVoidDialogOpen(true);
          }
        }}
        isSending={isSending}
        isResending={isResending}
      />

      {/* Void Confirmation Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contract annuleren?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je dit contract wilt annuleren? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Terug</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVoid} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Annuleren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ContractManagement;
