import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle, 
  XCircle,
  Clock,
  Search,
  Eye,
  RefreshCw,
  Download,
  Upload,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

const messageTypes = [
  { code: 'IFTMIN', name: 'Transport Order', description: 'Transportopdracht van klant' },
  { code: 'IFTSTA', name: 'Status Update', description: 'Statusmelding naar klant' },
  { code: 'INVOIC', name: 'Invoice', description: 'Elektronische factuur' },
  { code: 'DESADV', name: 'Despatch Advice', description: 'Verzendadvies' },
  { code: 'ORDERS', name: 'Purchase Order', description: 'Inkooporder' },
];

const mockMessages = [
  {
    id: '1',
    messageType: 'IFTMIN',
    direction: 'inbound',
    partnerName: 'HEMA Logistics',
    status: 'processed',
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    orderId: 'ORD-2024-1234',
  },
  {
    id: '2',
    messageType: 'IFTSTA',
    direction: 'outbound',
    partnerName: 'Albert Heijn',
    status: 'sent',
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    orderId: 'ORD-2024-1233',
  },
  {
    id: '3',
    messageType: 'INVOIC',
    direction: 'outbound',
    partnerName: 'Jumbo Supermarkten',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    orderId: 'ORD-2024-1232',
  },
  {
    id: '4',
    messageType: 'IFTMIN',
    direction: 'inbound',
    partnerName: 'Bol.com',
    status: 'failed',
    createdAt: new Date(Date.now() - 1000 * 60 * 90),
    orderId: null,
    error: 'Parsing error: Invalid segment UNH'
  },
  {
    id: '5',
    messageType: 'DESADV',
    direction: 'outbound',
    partnerName: 'Action Nederland',
    status: 'processed',
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
    orderId: 'ORD-2024-1230',
  },
];

const sampleEdiMessage = `UNB+UNOC:3+SENDER:ZZ+RECEIVER:ZZ+240115:1430+123456789'
UNH+1+IFTMIN:D:99B:UN'
BGM+610+TRN123456+9'
DTM+137:20240115:102'
NAD+CZ++++HEMA Logistics+Hoofdstraat 1+Amsterdam++1012AB+NL'
NAD+CN++++Warehouse B+Industrieweg 50+Rotterdam++3043AB+NL'
GID+1+10:CT'
FTX+AAA+++20 pallets consumer goods'
UNT+10+1'
UNZ+1+123456789'`;

export default function EDIIntegration() {
  const [messages, setMessages] = useState(mockMessages);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<typeof mockMessages[0] | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const filteredMessages = messages.filter(msg => 
    msg.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.messageType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.orderId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Verwerkt</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500 text-white"><ArrowUpRight className="h-3 w-3 mr-1" />Verzonden</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />In behandeling</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Mislukt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleRetry = (messageId: string) => {
    toast.info("Bericht opnieuw verwerken...");
    setTimeout(() => {
      setMessages((prev: any[]) => prev.map((m: any) =>
        m.id === messageId ? { ...m, status: 'processed', error: undefined } : m
      ));
      toast.success("Bericht succesvol verwerkt");
    }, 1500);
  };

  const stats = {
    total: messages.length,
    inbound: messages.filter(m => m.direction === 'inbound').length,
    outbound: messages.filter(m => m.direction === 'outbound').length,
    failed: messages.filter(m => m.status === 'failed').length,
  };

  return (
    <DashboardLayout title="EDI/EDIFACT Integratie" description="Beheer elektronische berichten met handelspartners">
      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messages">Berichten</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="mappings">Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Totaal berichten</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <ArrowDownLeft className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.inbound}</p>
                    <p className="text-sm text-muted-foreground">Inkomend</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <ArrowUpRight className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.outbound}</p>
                    <p className="text-sm text-muted-foreground">Uitgaand</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.failed}</p>
                    <p className="text-sm text-muted-foreground">Mislukt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Types */}
          <div className="flex gap-2 flex-wrap">
            {messageTypes.map(type => (
              <Badge key={type.code} variant="outline" className="cursor-pointer hover:bg-accent">
                {type.code}
              </Badge>
            ))}
          </div>

          {/* Messages Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>EDI Berichten</CardTitle>
                  <CardDescription>Overzicht van alle elektronische berichten</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Zoeken..." 
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Richting</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum/Tijd</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map(message => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Badge variant="secondary">{message.messageType}</Badge>
                      </TableCell>
                      <TableCell>
                        {message.direction === 'inbound' ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <ArrowDownLeft className="h-4 w-4" /> Inkomend
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-600">
                            <ArrowUpRight className="h-4 w-4" /> Uitgaand
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{message.partnerName}</TableCell>
                      <TableCell>
                        {message.orderId ? (
                          <span className="text-primary">{message.orderId}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(message.status)}</TableCell>
                      <TableCell>
                        {format(message.createdAt, "d MMM HH:mm", { locale: nl })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedMessage(message);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {message.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleRetry(message.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* View Message Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  EDI Bericht - {selectedMessage?.messageType}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Partner:</span>
                    <span className="ml-2 font-medium">{selectedMessage?.partnerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Richting:</span>
                    <span className="ml-2">{selectedMessage?.direction === 'inbound' ? 'Inkomend' : 'Uitgaand'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Order:</span>
                    <span className="ml-2">{selectedMessage?.orderId || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2">{selectedMessage && getStatusBadge(selectedMessage.status)}</span>
                  </div>
                </div>
                
                {selectedMessage?.status === 'failed' && selectedMessage.error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
                    <span className="font-medium text-destructive">Fout:</span> {selectedMessage.error}
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">EDI Content:</p>
                  <ScrollArea className="h-64 rounded border bg-muted/50 p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap">{sampleEdiMessage}</pre>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="partners" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>EDI Partners</CardTitle>
              <CardDescription>Configureer handelspartners voor elektronische berichtuitwisseling</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {['HEMA Logistics', 'Albert Heijn', 'Jumbo Supermarkten', 'Bol.com', 'Action Nederland'].map(partner => (
                  <Card key={partner}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{partner}</p>
                          <p className="text-sm text-muted-foreground">IFTMIN, IFTSTA, INVOIC</p>
                        </div>
                        <Badge className="bg-green-500 text-white">Actief</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Mappings</CardTitle>
              <CardDescription>Configureer hoe EDI velden worden vertaald naar het systeem</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>EDI Segment</TableHead>
                    <TableHead>EDI Veld</TableHead>
                    <TableHead>Systeem Veld</TableHead>
                    <TableHead>Transformatie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><Badge variant="outline">NAD+CZ</Badge></TableCell>
                    <TableCell>Party Name</TableCell>
                    <TableCell>customer.name</TableCell>
                    <TableCell>Direct</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge variant="outline">DTM+137</Badge></TableCell>
                    <TableCell>Document Date</TableCell>
                    <TableCell>order.created_at</TableCell>
                    <TableCell>Date Format: YYYYMMDD</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge variant="outline">GID</Badge></TableCell>
                    <TableCell>Goods Item</TableCell>
                    <TableCell>order.items[]</TableCell>
                    <TableCell>Array Mapping</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge variant="outline">FTX+AAA</Badge></TableCell>
                    <TableCell>Free Text</TableCell>
                    <TableCell>order.notes</TableCell>
                    <TableCell>Concatenate</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
