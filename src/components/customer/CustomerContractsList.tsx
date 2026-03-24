import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import type { CustomerContract } from '@/hooks/useCustomerContracts';

interface CustomerContractsListProps {
  contracts: CustomerContract[];
  isLoading: boolean;
  onRefresh: () => void;
  onContractClick: (contract: CustomerContract) => void;
  stats: {
    total: number;
    pending: number;
    signed: number;
  };
}

const getStatusBadge = (contract: CustomerContract) => {
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
    'sla': 'Service Level Agreement',
    'quote_acceptance': 'Offerte Akkoord',
    'terms_conditions': 'Algemene Voorwaarden',
    'order_confirmation': 'Opdrachtbevestiging',
    'transport_agreement': 'Transportovereenkomst',
    'general': 'Algemeen Contract',
  };
  return types[type] || type;
};

const needsAction = (contract: CustomerContract) => {
  const sigStatus = contract.signature_request?.status;
  return sigStatus && ['pending', 'sent', 'viewed'].includes(sigStatus);
};

export const CustomerContractsList = ({
  contracts,
  isLoading,
  onRefresh,
  onContractClick,
  stats,
}: CustomerContractsListProps) => {
  // Separate contracts that need action
  const actionRequired = contracts.filter(needsAction);
  const otherContracts = contracts.filter(c => !needsAction(c));

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mijn Contracten</h2>
          <p className="text-muted-foreground">
            Bekijk en onderteken uw contracten
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && 'animate-spin')} />
          Vernieuwen
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Totaal</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <PenLine className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Actie vereist</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.signed}</p>
                <p className="text-xs text-muted-foreground">Getekend</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Contracten laden...</p>
        </div>
      ) : contracts.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Inbox className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-xl mb-1">Geen contracten</p>
              <p className="text-muted-foreground max-w-sm">
                U heeft nog geen contracten ontvangen van uw charter.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Action Required Section */}
          {actionRequired.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="font-semibold text-amber-600 dark:text-amber-400">
                  Actie vereist ({actionRequired.length})
                </h3>
              </div>
              {actionRequired.map((contract) => (
                <Card 
                  key={contract.id}
                  className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent cursor-pointer hover:border-amber-500/50 transition-all"
                  onClick={() => onContractClick(contract)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{contract.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {getContractTypeLabel(contract.type)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(contract)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(contract.created_at), 'd MMM yyyy', { locale: nl })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-amber-500 flex-shrink-0" />
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
                <h3 className="font-semibold text-muted-foreground">
                  Overige contracten ({otherContracts.length})
                </h3>
              )}
              {otherContracts.map((contract) => (
                <Card 
                  key={contract.id}
                  className="cursor-pointer hover:border-primary/30 transition-all"
                  onClick={() => onContractClick(contract)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                          contract.status === 'completed' 
                            ? "bg-green-500/20" 
                            : "bg-muted"
                        )}>
                          <FileText className={cn(
                            "h-6 w-6",
                            contract.status === 'completed' 
                              ? "text-green-600 dark:text-green-400" 
                              : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{contract.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {getContractTypeLabel(contract.type)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(contract)}
                            <span className="text-xs text-muted-foreground">
                              {contract.completed_at 
                                ? `Getekend: ${format(new Date(contract.completed_at), 'd MMM yyyy', { locale: nl })}`
                                : format(new Date(contract.created_at), 'd MMM yyyy', { locale: nl })
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
