import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Clock,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Printer,
  History,
  Users,
  Truck,
  Building2,
  Calendar,
  Mail,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ContractDocument, ContractEvent } from '@/hooks/useContractManagement';

interface ContractDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractDocument | null;
  events: ContractEvent[];
  isLoadingEvents: boolean;
  onSend?: (contractId: string) => void;
  onResend?: (contractId: string) => void;
  onVoid?: (contractId: string) => void;
  isSending?: boolean;
  isResending?: boolean;
}

export function ContractDetailDialog({
  open,
  onOpenChange,
  contract,
  events,
  isLoadingEvents,
  onSend,
  onResend,
  onVoid,
  isSending,
  isResending,
}: ContractDetailDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('content');

  // Reset tab when opening
  useEffect(() => {
    if (open) {
      setActiveTab('content');
    }
  }, [open]);

  if (!contract) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return { 
          label: 'Concept', 
          icon: Clock, 
          className: 'bg-muted text-muted-foreground border-muted' 
        };
      case 'sent':
        return { 
          label: 'Verzonden', 
          icon: Send, 
          className: 'bg-blue-500/20 text-blue-600 border-blue-500/30' 
        };
      case 'viewed':
        return { 
          label: 'Bekeken', 
          icon: Eye, 
          className: 'bg-amber-500/20 text-amber-600 border-amber-500/30' 
        };
      case 'completed':
        return { 
          label: 'Ondertekend', 
          icon: CheckCircle2, 
          className: 'bg-green-500/20 text-green-600 border-green-500/30' 
        };
      case 'declined':
        return { 
          label: 'Afgewezen', 
          icon: XCircle, 
          className: 'bg-red-500/20 text-red-600 border-red-500/30' 
        };
      case 'expired':
        return { 
          label: 'Verlopen', 
          icon: AlertCircle, 
          className: 'bg-gray-500/20 text-gray-600 border-gray-500/30' 
        };
      default:
        return { 
          label: status, 
          icon: FileText, 
          className: 'bg-muted text-muted-foreground' 
        };
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

  const getRecipientLabel = (type: string) => {
    switch (type) {
      case 'driver': return 'Chauffeur';
      case 'customer': return 'Klant';
      case 'carrier': return 'Charter';
      default: return type;
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created': return FileText;
      case 'sent': return Send;
      case 'viewed': return Eye;
      case 'signed': return CheckCircle2;
      case 'completed': return CheckCircle2;
      case 'declined': return XCircle;
      case 'reminder_sent': return RefreshCw;
      case 'expired': return AlertCircle;
      default: return Clock;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created': return 'text-blue-500 bg-blue-500/10';
      case 'sent': return 'text-blue-600 bg-blue-600/10';
      case 'viewed': return 'text-amber-500 bg-amber-500/10';
      case 'signed': return 'text-green-500 bg-green-500/10';
      case 'completed': return 'text-green-600 bg-green-600/10';
      case 'declined': return 'text-red-500 bg-red-500/10';
      case 'reminder_sent': return 'text-purple-500 bg-purple-500/10';
      case 'expired': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const statusConfig = getStatusConfig(contract.status);
  const StatusIcon = statusConfig.icon;
  const RecipientIcon = getRecipientIcon(contract.counterparty_type);

  const canSend = contract.status === 'draft';
  const canResend = ['sent', 'viewed'].includes(contract.status);
  const canVoid = !['completed', 'declined', 'expired'].includes(contract.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b space-y-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
              contract.status === 'completed' ? "bg-green-500/20" :
              contract.status === 'declined' ? "bg-red-500/20" :
              ['sent', 'viewed'].includes(contract.status) ? "bg-blue-500/20" :
              "bg-muted"
            )}>
              <FileText className={cn(
                "h-7 w-7",
                contract.status === 'completed' ? "text-green-600" :
                contract.status === 'declined' ? "text-red-600" :
                ['sent', 'viewed'].includes(contract.status) ? "text-blue-600" :
                "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold leading-tight">
                {contract.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={statusConfig.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  v{contract.version}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {contract.pdf_storage_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = contract.pdf_storage_url!;
                    a.download = `Contract_${contract.title || 'document'}.pdf`;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast({ title: 'PDF gedownload', description: 'Het contract wordt gedownload.' });
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (contract.pdf_storage_url) {
                    try {
                      const response = await fetch(contract.pdf_storage_url);
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const iframe = document.createElement('iframe');
                      iframe.style.position = 'fixed';
                      iframe.style.left = '-9999px';
                      iframe.style.top = '-9999px';
                      iframe.style.width = '0';
                      iframe.style.height = '0';
                      document.body.appendChild(iframe);
                      iframe.src = url;
                      iframe.onload = () => {
                        iframe.contentWindow?.print();
                        setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 1000);
                      };
                    } catch { /* fallback */ }
                  }
                  toast({ title: 'Print', description: 'Print wordt geopend (via PDF).' });
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <RecipientIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{getRecipientLabel(contract.counterparty_type)}:</span>
              <span className="font-medium">{contract.counterparty_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Aangemaakt:</span>
              <span>{format(new Date(contract.created_at), 'd MMM yyyy', { locale: nl })}</span>
            </div>
            {contract.sent_at && (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Verzonden:</span>
                <span>{format(new Date(contract.sent_at), 'd MMM yyyy', { locale: nl })}</span>
              </div>
            )}
            {contract.completed_at && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Ondertekend:</span>
                <span className="text-green-600 font-medium">
                  {format(new Date(contract.completed_at), 'd MMM yyyy HH:mm', { locale: nl })}
                </span>
              </div>
            )}
            {contract.expires_at && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-muted-foreground">Vervalt:</span>
                <span className="text-amber-600">
                  {format(new Date(contract.expires_at), 'd MMM yyyy', { locale: nl })}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList className="h-12 w-full justify-start bg-transparent p-0 gap-4">
              <TabsTrigger 
                value="content" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                <FileText className="h-4 w-4 mr-2" />
                Inhoud
              </TabsTrigger>
              <TabsTrigger 
                value="timeline"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                <History className="h-4 w-4 mr-2" />
                Tijdlijn
                {events.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {events.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="signers"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              >
                <Users className="h-4 w-4 mr-2" />
                Ondertekenaars
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content Tab */}
          <TabsContent value="content" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[50vh]">
              <div className="p-6">
                {contract.content_html ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contract.content_html || '') }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Contract inhoud niet beschikbaar</p>
                    {contract.pdf_storage_url && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = contract.pdf_storage_url!;
                          a.download = `Contract_${contract.title || 'document'}.pdf`;
                          a.target = '_blank';
                          a.rel = 'noopener noreferrer';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          toast({ title: 'PDF gedownload', description: 'Het contract wordt gedownload.' });
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Bekijk PDF
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[50vh]">
              <div className="p-6">
                {isLoadingEvents ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Geen activiteit gevonden</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                    
                    <div className="space-y-6">
                      {events.map((event, index) => {
                        const EventIcon = getEventIcon(event.event_type);
                        const colorClass = getEventColor(event.event_type);
                        
                        return (
                          <div key={event.id} className="relative flex gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10",
                              colorClass
                            )}>
                              <EventIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm">
                                  {event.event_description || event.event_type}
                                </p>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {formatDistanceToNow(new Date(event.timestamp), { 
                                    addSuffix: true, 
                                    locale: nl 
                                  })}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                                {event.actor_name && (
                                  <span>Door: {event.actor_name}</span>
                                )}
                                {event.device_type && (
                                  <span>Apparaat: {event.device_type}</span>
                                )}
                                {event.ip_address && (
                                  <span>IP: {event.ip_address}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                {format(new Date(event.timestamp), 'd MMM yyyy HH:mm:ss', { locale: nl })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Signers Tab */}
          <TabsContent value="signers" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[50vh]">
              <div className="p-6 space-y-4">
                {contract.signature_requests && contract.signature_requests.length > 0 ? (
                  contract.signature_requests.map((signer, index) => (
                    <div 
                      key={signer.id} 
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{signer.signer_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {signer.signer_email || 'Geen e-mail'}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          signer.status === 'signed' 
                            ? "bg-green-500/20 text-green-600 border-green-500/30" 
                            : signer.status === 'declined'
                              ? "bg-red-500/20 text-red-600 border-red-500/30"
                              : signer.status === 'viewed'
                                ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                                : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                        }>
                          {signer.status === 'signed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {signer.status === 'declined' && <XCircle className="h-3 w-3 mr-1" />}
                          {signer.status === 'viewed' && <Eye className="h-3 w-3 mr-1" />}
                          {signer.status === 'sent' && <Send className="h-3 w-3 mr-1" />}
                          {signer.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {signer.status === 'signed' ? 'Ondertekend' :
                           signer.status === 'declined' ? 'Afgewezen' :
                           signer.status === 'viewed' ? 'Bekeken' :
                           signer.status === 'sent' ? 'Verzonden' : 'In afwachting'}
                        </Badge>
                        {signer.signed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(signer.signed_at), 'd MMM yyyy HH:mm', { locale: nl })}
                          </p>
                        )}
                        {signer.decline_reason && (
                          <p className="text-xs text-red-500 mt-1">
                            Reden: {signer.decline_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Geen ondertekenaars gevonden</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Action Footer */}
        {(canSend || canResend || canVoid) && (
          <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
            {canVoid && onVoid && (
              <Button 
                variant="outline" 
                onClick={() => onVoid(contract.id)}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuleren
              </Button>
            )}
            {canResend && onResend && (
              <Button 
                variant="outline" 
                onClick={() => onResend(contract.id)}
                disabled={isResending}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isResending && "animate-spin")} />
                Herinnering verzenden
              </Button>
            )}
            {canSend && onSend && (
              <Button 
                onClick={() => onSend(contract.id)}
                disabled={isSending}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? 'Verzenden...' : 'Verzenden'}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}