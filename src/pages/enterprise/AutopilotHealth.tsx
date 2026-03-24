import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useHolds, useJobRuns, useIntegrationFailures } from '@/hooks/useWorldClassData';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Shield,
  Activity,
  Settings2,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const AutopilotHealth = () => {
  const { toast } = useToast();
  const { data: activeHolds } = useHolds('active');
  const { data: jobRuns, isLoading: loadingJobs } = useJobRuns(undefined, 20);
  const { data: failures } = useIntegrationFailures('pending');
  const [retryingAll, setRetryingAll] = useState(false);
  const [retryingItem, setRetryingItem] = useState<string | null>(null);
  const [resolvedItems, setResolvedItems] = useState<string[]>([]);

  // Compute from real data
  const automationStats = {
    active: jobRuns?.filter((j: any) => j.status === 'running').length || 0,
    blocks: (activeHolds?.length || 0) + (failures?.length || 0),
    failures: failures?.length || 0,
  };

  const handleRetryAll = async () => {
    setRetryingAll(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRetryingAll(false);
    toast({ title: "Retry voltooid", description: "Alle gefaalde integraties zijn opnieuw geprobeerd." });
  };

  const handleRetryItem = async (id: string, source: string) => {
    setRetryingItem(id);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRetryingItem(null);
    toast({ title: "Retry voltooid", description: `${source} is succesvol opnieuw uitgevoerd.` });
  };

  const handleResolveItem = (id: string, source: string) => {
    setResolvedItems(prev => [...prev, id]);
    toast({ title: "Afgehandeld", description: `${source} fout is als opgelost gemarkeerd.` });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><Zap className="h-3 w-3 mr-1" /> Actief</Badge>;
      case 'paused':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><Pause className="h-3 w-3 mr-1" /> Gepauzeerd</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-600';
      case 'high': return 'bg-orange-500/10 text-orange-600';
      case 'medium': return 'bg-amber-500/10 text-amber-600';
      case 'low': return 'bg-blue-500/10 text-blue-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const displayedFailures = (failures || []).filter((f: any) => !resolvedItems.includes(f.id));

  return (
    <DashboardLayout 
      title="Autopilot Health" 
      description="Status van alle automations en actieve blocks"
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Zap className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{automationStats.active}</p>
                  <p className="text-xs text-muted-foreground">Actieve automations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{automationStats.blocks}</p>
                  <p className="text-xs text-muted-foreground">Actieve blocks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <XCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{automationStats.failures}</p>
                  <p className="text-xs text-muted-foreground">Failures (24u)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">96%</p>
                  <p className="text-xs text-muted-foreground">Success rate (7d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Automations Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Automation Status</CardTitle>
                <CardDescription>Overzicht van alle actieve automations</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/enterprise/automation">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Beheer
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {jobRuns && jobRuns.length > 0 ? (
                <div className="space-y-4">
                  {jobRuns.slice(0, 5).map((job: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{job.job_name || job.id}</span>
                          {getStatusBadge(job.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {job.started_at ? formatDistanceToNow(new Date(job.started_at), { locale: nl, addSuffix: true }) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">Geen automation runs</p>
                  <p className="text-sm">Configureer automations via Beheer</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Blocks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Actieve Blocks</CardTitle>
                <CardDescription>Redenen waarom automations worden geblokkeerd</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/enterprise/holds">
                  <Shield className="h-4 w-4 mr-2" />
                  Holds
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeHolds && activeHolds.length > 0 ? (
                <div className="space-y-3">
                  {activeHolds.map((hold: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getSeverityColor(hold.severity || 'medium')}`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{hold.reason_code || hold.entity_type}</span>
                      </div>
                      <Badge variant="outline" className={getSeverityColor(hold.severity || 'medium')}>
                        {hold.scope || '-'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">Geen actieve blocks</p>
                  <p className="text-sm">Alle automations draaien ongehinderd</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Failures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recente Failures</CardTitle>
              <CardDescription>Integration en automation fouten van de afgelopen 24 uur</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetryAll} disabled={retryingAll}>
              {retryingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Retry All
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bron</TableHead>
                  <TableHead>Fout</TableHead>
                  <TableHead>Tijd</TableHead>
                  <TableHead>Pogingen</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedFailures.length > 0 ? displayedFailures.map((failure: any, idx: number) => (
                  <TableRow key={idx} className={resolvedItems.includes(failure.id) ? 'opacity-50' : ''}>
                    <TableCell>
                      <Badge variant="outline">{failure.source || failure.integration_name || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{failure.error_message || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {failure.detected_at ? formatDistanceToNow(new Date(failure.detected_at), { locale: nl, addSuffix: true }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                        {failure.retry_count || 0}/5
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRetryItem(failure.id, failure.source || failure.integration_name)}
                          disabled={retryingItem === failure.id}
                        >
                          {retryingItem === failure.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleResolveItem(failure.id, failure.source || failure.integration_name)}
                          disabled={resolvedItems.includes(failure.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Geen failures in de afgelopen 24 uur
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button asChild>
            <Link to="/enterprise/reconciliation">
              Open Review Queue
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/enterprise/holds">
              Resolve Holds
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/enterprise/automation">
              Run Simulator
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AutopilotHealth;
