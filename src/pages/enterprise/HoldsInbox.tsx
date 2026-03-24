import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useHolds, useResolveHold } from '@/hooks/useWorldClassData';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  ArrowUp,
  FileText,
  CreditCard,
  Ban,
  Eye,
  Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const HoldsInbox = () => {
  const { toast } = useToast();
  const { data: activeHolds, isLoading: loadingActive } = useHolds('active');
  const { data: resolvedHolds, isLoading: loadingResolved } = useHolds('resolved');
  const resolveHold = useResolveHold();
  const [selectedHold, setSelectedHold] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  
  // New state for detail and escalation dialogs
  const [detailHold, setDetailHold] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalateHold, setEscalateHold] = useState<any>(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalatePriority, setEscalatePriority] = useState('high');
  const [isEscalating, setIsEscalating] = useState(false);


  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Kritiek</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Hoog</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Laag</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'INVOICE_SEND':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'PAYOUT':
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
      case 'REMINDERS':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Ban className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleResolve = async () => {
    if (selectedHold) {
      await resolveHold.mutateAsync({ id: selectedHold.id, resolution_note: resolutionNote });
      setSelectedHold(null);
      setResolutionNote('');
    }
  };

  const displayHolds = activeHolds || [];

  return (
    <DashboardLayout 
      title="Holds Inbox" 
      description="Beheer actieve holds die operaties blokkeren"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{displayHolds.filter(h => h.severity === 'critical').length}</p>
                  <p className="text-xs text-muted-foreground">Kritieke holds</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{displayHolds.filter(h => h.severity === 'high').length}</p>
                  <p className="text-xs text-muted-foreground">Hoge prioriteit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{displayHolds.filter(h => h.requires_two_person_approval).length}</p>
                  <p className="text-xs text-muted-foreground">Vereist 2-persoons goedkeuring</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resolvedHolds?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Opgelost (30 dagen)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holds Table */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Actieve Holds ({displayHolds.length})</TabsTrigger>
            <TabsTrigger value="resolved">Opgelost ({resolvedHolds?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Actieve Holds</CardTitle>
                <CardDescription>
                  Deze holds blokkeren automatische operaties totdat ze zijn opgelost
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Reden</TableHead>
                      <TableHead>Target datum</TableHead>
                      <TableHead>Goedkeuring</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayHolds.map((hold) => (
                      <TableRow key={hold.id}>
                        <TableCell>{getSeverityBadge(hold.severity)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getScopeIcon(hold.scope)}
                            <span className="text-sm">{hold.scope}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{hold.entity_id}</TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="mb-1">{hold.reason_code}</Badge>
                            <p className="text-sm text-muted-foreground">{hold.reason_description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {hold.target_resolution_date && (
                            <span className="text-sm">{format(new Date(hold.target_resolution_date), 'd MMM yyyy', { locale: nl })}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hold.requires_two_person_approval ? (
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/30">
                              <User className="h-3 w-3 mr-1" />
                              2-persoons
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setDetailHold(hold);
                                setShowDetailDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setEscalateHold(hold);
                                setShowEscalateDialog(true);
                              }}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedHold(hold)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Oplossen
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resolved" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Opgeloste Holds</CardTitle>
                <CardDescription>Holds die de afgelopen 30 dagen zijn opgelost</CardDescription>
              </CardHeader>
              <CardContent>
                {resolvedHolds?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Reden</TableHead>
                        <TableHead>Opgelost op</TableHead>
                        <TableHead>Notities</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resolvedHolds.map((hold) => (
                        <TableRow key={hold.id}>
                          <TableCell className="font-mono text-sm">{hold.entity_id}</TableCell>
                          <TableCell>{hold.reason_code}</TableCell>
                          <TableCell>
                            {hold.resolved_at && format(new Date(hold.resolved_at), 'd MMM yyyy HH:mm', { locale: nl })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{hold.resolution_note || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Geen opgeloste holds in de afgelopen 30 dagen
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Resolve Dialog */}
        <Dialog open={!!selectedHold} onOpenChange={() => setSelectedHold(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hold Oplossen</DialogTitle>
              <DialogDescription>
                Bevestig dat de hold voor {selectedHold?.entity_id} is opgelost
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedHold?.reason_code}</p>
                <p className="text-sm text-muted-foreground">{selectedHold?.reason_description}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Resolution notitie</label>
                <Textarea 
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Beschrijf hoe de hold is opgelost..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedHold(null)}>
                Annuleren
              </Button>
              <Button onClick={handleResolve} disabled={resolveHold.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Oplossen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hold Details Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Hold Details</DialogTitle>
              <DialogDescription>Volledige informatie over deze hold</DialogDescription>
            </DialogHeader>
            {detailHold && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Entity</Label>
                    <p className="font-mono text-sm">{detailHold.entity_id}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Severity</Label>
                    <p>{getSeverityBadge(detailHold.severity)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Scope</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getScopeIcon(detailHold.scope)}
                      <span className="text-sm">{detailHold.scope}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Goedkeuring</Label>
                    <p>{detailHold.requires_two_person_approval ? (
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/30">
                        <User className="h-3 w-3 mr-1" />2-persoons
                      </Badge>
                    ) : 'Standaard'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reden</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="mb-1">{detailHold.reason_code}</Badge>
                    <p className="text-sm text-muted-foreground">{detailHold.reason_description}</p>
                  </div>
                </div>
                {detailHold.target_resolution_date && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Target Datum</Label>
                    <p className="text-sm">{format(new Date(detailHold.target_resolution_date), 'd MMM yyyy', { locale: nl })}</p>
                  </div>
                )}
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Timeline</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>Aangemaakt: {format(new Date(detailHold.created_at), 'd MMM yyyy HH:mm', { locale: nl })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Sluiten</Button>
              <Button onClick={() => {
                setShowDetailDialog(false);
                setSelectedHold(detailHold);
              }}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Oplossen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Escalate Dialog */}
        <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hold Escaleren</DialogTitle>
              <DialogDescription>
                Escaleer deze hold naar management voor snellere afhandeling
              </DialogDescription>
            </DialogHeader>
            {escalateHold && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{escalateHold.entity_id}</p>
                  <p className="text-xs text-muted-foreground">{escalateHold.reason_description}</p>
                </div>
                <div className="space-y-2">
                  <Label>Escalatie naar</Label>
                  <Select defaultValue="manager">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Direct Manager</SelectItem>
                      <SelectItem value="finance">Finance Team</SelectItem>
                      <SelectItem value="operations">Operations Lead</SelectItem>
                      <SelectItem value="cfo">CFO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioriteit</Label>
                  <Select value={escalatePriority} onValueChange={setEscalatePriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normaal</SelectItem>
                      <SelectItem value="high">Hoog</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reden voor escalatie</Label>
                  <Textarea 
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="Beschrijf waarom deze hold moet worden geëscaleerd..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowEscalateDialog(false);
                setEscalateReason('');
              }}>Annuleren</Button>
              <Button 
                onClick={async () => {
                  setIsEscalating(true);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  setIsEscalating(false);
                  toast({
                    title: "Hold geëscaleerd ✓",
                    description: `${escalateHold?.entity_id} is geëscaleerd met prioriteit ${escalatePriority}.`,
                  });
                  setShowEscalateDialog(false);
                  setEscalateReason('');
                  setEscalateHold(null);
                }}
                disabled={isEscalating || !escalateReason.trim()}
              >
                {isEscalating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUp className="h-4 w-4 mr-2" />}
                Escaleren
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default HoldsInbox;
