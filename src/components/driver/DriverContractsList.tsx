import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Inbox,
  PenLine,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DriverContract } from '@/hooks/useDriverContracts';

interface DriverContractsListProps {
  contracts: DriverContract[];
  isLoading: boolean;
  onRefresh: () => void;
  onContractClick: (contract: DriverContract) => void;
  onBack?: () => void;
  stats: {
    total: number;
    pending: number;
    signed: number;
  };
}

const getStatusBadge = (contract: DriverContract) => {
  const sigStatus = contract.signature_request?.status;
  
  if (contract.status === 'completed') {
    return (
      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Ondertekend
      </Badge>
    );
  }
  
  if (contract.status === 'declined') {
    return (
      <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
        <XCircle className="h-3 w-3 mr-1" />
        Afgewezen
      </Badge>
    );
  }

  if (contract.status === 'expired') {
    return (
      <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30">
        <AlertCircle className="h-3 w-3 mr-1" />
        Verlopen
      </Badge>
    );
  }
  
  if (sigStatus === 'pending' || sigStatus === 'sent') {
    return (
      <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
        <PenLine className="h-3 w-3 mr-1" />
        Te ondertekenen
      </Badge>
    );
  }

  if (sigStatus === 'viewed') {
    return (
      <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
        <Clock className="h-3 w-3 mr-1" />
        Bekeken
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline">
      {contract.status}
    </Badge>
  );
};

const getContractTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    'zzp_agreement': 'ZZP Overeenkomst',
    'nda': 'Geheimhoudingsverklaring',
    'code_of_conduct': 'Gedragscode',
    'rate_agreement': 'Tariefafspraak',
    'subcontractor': 'Onderaannemersovereenkomst',
    'general': 'Algemeen Contract',
  };
  return types[type] || type;
};

const needsAction = (contract: DriverContract) => {
  const sigStatus = contract.signature_request?.status;
  return sigStatus && ['pending', 'sent', 'viewed'].includes(sigStatus);
};

export const DriverContractsList = ({
  contracts,
  isLoading,
  onRefresh,
  onContractClick,
  onBack,
  stats,
}: DriverContractsListProps) => {
  // Separate contracts that need action
  const actionRequired = contracts.filter(needsAction);
  const otherContracts = contracts.filter(c => !needsAction(c));

  return (
    <div className="flex flex-col h-full">
      {/* Header Stats */}
      <div className="flex-shrink-0 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-10 w-10 rounded-xl"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </Button>
            )}
            <div>
              <h2 className="text-xl font-bold">Mijn Contracten</h2>
              <p className="text-sm text-muted-foreground">
                Bekijk en onderteken je contracten
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-10 w-10 rounded-xl"
          >
            <RefreshCw className={cn("h-5 w-5", isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 border border-primary/20">
            <div className="flex items-center gap-1 mb-1">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Totaal</span>
            </div>
            <p className="text-xl font-bold text-primary">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-3 border border-amber-500/20">
            <div className="flex items-center gap-1 mb-1">
              <PenLine className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Actie</span>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-3 border border-green-500/20">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Getekend</span>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.signed}</p>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-28 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Contracten laden...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
                <Inbox className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-xl text-foreground mb-1">Geen contracten</p>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                Je hebt nog geen contracten ontvangen
              </p>
            </div>
          ) : (
            <>
              {/* Action Required Section */}
              {actionRequired.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      Actie vereist ({actionRequired.length})
                    </h3>
                  </div>
                  {actionRequired.map((contract) => (
                    <Card 
                      key={contract.id}
                      className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent cursor-pointer hover:border-amber-500/50 transition-all active:scale-[0.98]"
                      onClick={() => onContractClick(contract)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{contract.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getContractTypeLabel(contract.type)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusBadge(contract)}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(contract.created_at), 'd MMM yyyy', { locale: nl })}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-amber-500 flex-shrink-0 mt-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Other Contracts Section */}
              {otherContracts.length > 0 && (
                <div className="space-y-3">
                  {actionRequired.length > 0 && (
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Overige contracten ({otherContracts.length})
                    </h3>
                  )}
                  {otherContracts.map((contract) => (
                    <Card 
                      key={contract.id}
                      className="cursor-pointer hover:border-border transition-all active:scale-[0.98]"
                      onClick={() => onContractClick(contract)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                contract.status === 'completed' 
                                  ? "bg-green-500/20" 
                                  : "bg-muted"
                              )}>
                                <FileText className={cn(
                                  "h-5 w-5",
                                  contract.status === 'completed' 
                                    ? "text-green-600 dark:text-green-400" 
                                    : "text-muted-foreground"
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{contract.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getContractTypeLabel(contract.type)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {getStatusBadge(contract)}
                              <span className="text-xs text-muted-foreground">
                                {contract.completed_at 
                                  ? `Getekend: ${format(new Date(contract.completed_at), 'd MMM yyyy', { locale: nl })}`
                                  : format(new Date(contract.created_at), 'd MMM yyyy', { locale: nl })
                                }
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
