import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReconciliationIssues, useResolveReconciliationIssue } from '@/hooks/useEnterpriseData';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  CreditCard,
  RefreshCw,
  Wrench,
  User,
  Clock,
  Filter,
  Download,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const ReconciliationQueue = () => {
  const { toast } = useToast();
  const { data: issues, isLoading, refetch } = useReconciliationIssues();
  const resolveIssue = useResolveReconciliationIssue();
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  
  // New state for assign dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [assignee, setAssignee] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);


  const displayIssues = (issues || []).filter((issue: any) => {
    if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Kritiek</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Hoog</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Laag</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'missing_invoice':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'missing_pod':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'orphan_snapshot':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'ledger_mismatch':
        return <CreditCard className="h-4 w-4 text-red-500" />;
      case 'payout_mismatch':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const stats = {
    open: displayIssues.filter(i => i.status === 'open').length,
    critical: displayIssues.filter(i => i.severity === 'critical' && i.status === 'open').length,
    resolved: (issues || []).filter((i: any) => i.status === 'resolved').length,
  };

  return (
    <DashboardLayout 
      title="Reconciliation Queue" 
      description="Detecteer en herstel drift tussen systemen"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.open}</p>
                  <p className="text-xs text-muted-foreground">Open Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Kritiek</p>
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
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                  <p className="text-xs text-muted-foreground">Opgelost (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">2u</p>
                  <p className="text-xs text-muted-foreground">Gem. Oplostijd</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Reconciliation Issues</CardTitle>
              <CardDescription>Automatisch gedetecteerde inconsistenties</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const csvContent = displayIssues.map(i => 
                    `${i.issue_type},${i.description},${i.severity},${i.status}`
                  ).join('\n');
                  const blob = new Blob([`Type,Beschrijving,Severity,Status\n${csvContent}`], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'reconciliation-issues.csv';
                  a.click();
                  toast({
                    title: "Export voltooid",
                    description: "Reconciliation issues zijn geëxporteerd",
                  });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filters:</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Opgelost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="critical">Kritiek</SelectItem>
                  <SelectItem value="high">Hoog</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Laag</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Beschrijving</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Gedetecteerd</TableHead>
                  <TableHead>Suggested Fix</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayIssues.map((issue) => (
                  <TableRow key={issue.id} className={issue.status === 'resolved' ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(issue.issue_type)}
                        <span className="text-xs font-mono">{issue.issue_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="font-medium truncate">{issue.description}</p>
                    </TableCell>
                    <TableCell>{getSeverityBadge(issue.severity)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(issue.detected_at), 'dd MMM HH:mm', { locale: nl })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {issue.suggested_fix}
                    </TableCell>
                        <TableCell>
                          {(issue as any).owner_id ? (
                            <Badge variant="outline">
                              <User className="h-3 w-3 mr-1" />
                              Toegewezen
                            </Badge>
                          ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {issue.status === 'open' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resolveIssue.mutate({ id: issue.id })}
                          >
                            <Wrench className="h-4 w-4 mr-1" />
                            Fix
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedIssue(issue);
                              setShowAssignDialog(true);
                            }}
                          >
                            <User className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Opgelost
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {displayIssues.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                <p className="font-medium">Geen open issues</p>
                <p className="text-sm">Alle reconciliation checks zijn geslaagd</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Toewijzen</DialogTitle>
              <DialogDescription>
                Wijs dit issue toe aan een teamlid voor afhandeling
              </DialogDescription>
            </DialogHeader>
            {selectedIssue && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeIcon(selectedIssue.issue_type)}
                    <span className="text-xs font-mono">{selectedIssue.issue_type}</span>
                  </div>
                  <p className="text-sm">{selectedIssue.description}</p>
                </div>
                <div className="space-y-2">
                  <Label>Toewijzen aan</Label>
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer teamlid..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jan">Jan de Vries</SelectItem>
                      <SelectItem value="marie">Marie Jansen</SelectItem>
                      <SelectItem value="peter">Peter Bakker</SelectItem>
                      <SelectItem value="sophie">Sophie van Dam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notitie (optioneel)</Label>
                  <textarea 
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                    placeholder="Instructies of context voor de assignee..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAssignDialog(false);
                setAssignee('');
                setAssignNote('');
              >Annuleren</Button>
              <Button 
                onClick={async () => {
                  if (!selectedIssue || !assignee) return;
                  setIsAssigning(true);
                  try {
                    const { error } = await supabase
                      .from('reconciliation_issues')
                      .update({
                        owner_id: assignee,
                        assigned_at: new Date().toISOString(),
                        assignment_note: assignNote || null,
                      } as any)
                      .eq('id', selectedIssue.id);
                    
                    if (error) throw error;
                    
                    toast({
                      title: "Issue toegewezen ✓",
                      description: `${selectedIssue?.issue_type} is toegewezen.`,
                    });
                    refetch();
                  } catch (err) {
                    toast({
                      title: "Fout bij toewijzen",
                      description: (err as Error).message,
                      variant: "destructive",
                    });
                  }
                  setIsAssigning(false);
                  setShowAssignDialog(false);
                  setAssignee('');
                  setAssignNote('');
                  setSelectedIssue(null);
                }}
                disabled={isAssigning || !assignee}
              >
                {isAssigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <User className="h-4 w-4 mr-2" />}
                Toewijzen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ReconciliationQueue;
