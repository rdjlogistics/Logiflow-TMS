import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useSystemJobs, useSystemIncidents, useAcknowledgeIncident } from '@/hooks/useEnterpriseData';
import { useClientErrorLogs, useClientErrorSummary } from '@/hooks/useClientErrorLogs';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Zap,
  Database,
  Webhook,
  Mail,
  Download,
  Eye,
  Server,
  Gauge,
  Bug
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';

const SystemHealth = () => {
  const { data: jobs, isLoading: loadingJobs } = useSystemJobs();
  const { data: incidents, isLoading: loadingIncidents } = useSystemIncidents();
  const acknowledgeIncident = useAcknowledgeIncident();
  const { data: errorLogs, isLoading: loadingErrors } = useClientErrorLogs(100);
  const { data: errorSummary } = useClientErrorSummary();

  const displayJobs = jobs || [];
  const displayIncidents = incidents || [];

  const getJobIcon = (type: string) => {
    switch (type) {
      case 'import': return <Database className="h-4 w-4 text-blue-500" />;
      case 'matching': return <Zap className="h-4 w-4 text-purple-500" />;
      case 'webhook': return <Webhook className="h-4 w-4 text-orange-500" />;
      case 'automation': return <Activity className="h-4 w-4 text-emerald-500" />;
      case 'forecast': return <Gauge className="h-4 w-4 text-cyan-500" />;
      case 'reconciliation': return <RefreshCw className="h-4 w-4 text-amber-500" />;
      default: return <Server className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Voltooid</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Actief</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Gefaald</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Wachtend</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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

  const getIncidentStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Open</Badge>;
      case 'acknowledged':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Erkend</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Opgelost</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stats
  const jobsLast24h = displayJobs.filter(j => new Date(j.created_at) > new Date(Date.now() - 86400000));
  const successRate = jobsLast24h.length > 0 
    ? Math.round((jobsLast24h.filter(j => j.status === 'completed').length / jobsLast24h.length) * 100)
    : 100;
  const avgDuration = jobsLast24h.filter(j => j.duration_ms).reduce((acc, j) => acc + (j.duration_ms || 0), 0) / (jobsLast24h.filter(j => j.duration_ms).length || 1);
  const openIncidents = displayIncidents.filter(i => i.status === 'open').length;

  return (
    <DashboardLayout 
      title="System Health" 
      description="Observability dashboard voor jobs, integraties en SLA metrics"
    >
      <div className="space-y-6">
        {/* Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Activity className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{successRate}%</p>
                  <p className="text-xs text-muted-foreground">Success Rate (24u)</p>
                </div>
              </div>
              <Progress value={successRate} className="mt-3 h-1" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Math.round(avgDuration)}ms</p>
                  <p className="text-xs text-muted-foreground">Gem. Job Duur</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{jobsLast24h.length}</p>
                  <p className="text-xs text-muted-foreground">Jobs (24u)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={openIncidents > 0 ? 'border-orange-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${openIncidents > 0 ? 'bg-orange-500/10' : 'bg-emerald-500/10'}`}>
                  <AlertTriangle className={`h-5 w-5 ${openIncidents > 0 ? 'text-orange-600' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openIncidents}</p>
                  <p className="text-xs text-muted-foreground">Open Incidents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs">Job Monitor</TabsTrigger>
            <TabsTrigger value="incidents">
              Incidents
              {openIncidents > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">{openIncidents}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="integrations">Integration Errors</TabsTrigger>
            <TabsTrigger value="client-errors">
              Client Errors
              {(errorSummary?.length ?? 0) > 0 && (
                <Badge variant="outline" className="ml-2 h-5 px-1.5 bg-destructive/10 text-destructive border-destructive/30">
                  {errorSummary?.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Job Monitor</CardTitle>
                  <CardDescription>Alle achtergrond jobs en hun status</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  const csvContent = `Job Monitor Export\n\nJob Name,Type,Status,Gestart,Duur,Verwerkt,Errors\n${displayJobs.map(j => 
                    `${j.job_name},${j.job_type},${j.status},${format(new Date(j.started_at || j.created_at), 'dd MMM HH:mm', { locale: nl })},${j.duration_ms || '-'}ms,${j.processed_count},${j.error_count}`
                  ).join('\n')}`;
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'job-monitor-export.csv';
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success('Export gedownload', { description: 'Job monitor data is geëxporteerd als CSV.' });
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Gestart</TableHead>
                      <TableHead>Duur</TableHead>
                      <TableHead>Verwerkt</TableHead>
                      <TableHead>Errors</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.job_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getJobIcon(job.job_type)}
                            <span className="text-xs font-mono">{job.job_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(job.started_at || job.created_at), 'dd MMM HH:mm', { locale: nl })}
                        </TableCell>
                        <TableCell>
                          {job.duration_ms ? `${job.duration_ms}ms` : job.status === 'running' ? '...' : '—'}
                        </TableCell>
                        <TableCell>{job.processed_count}</TableCell>
                        <TableCell>
                          {job.error_count > 0 ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600">{job.error_count}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => {
                            toast.info(`Job details: ${job.job_name}`, { 
                              description: `Status: ${job.status}, Verwerkt: ${job.processed_count}, Errors: ${job.error_count}${job.error_details ? `, Fout: ${JSON.stringify(job.error_details)}` : ''}`
                            });
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>System Incidents</CardTitle>
                <CardDescription>Laatste 24 uur incidenten en alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Incident</TableHead>
                      <TableHead>Bron</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Tijd</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{incident.title}</p>
                            <p className="text-xs text-muted-foreground">{incident.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{incident.source}</TableCell>
                        <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(incident.created_at), 'dd MMM HH:mm', { locale: nl })}
                        </TableCell>
                        <TableCell>{getIncidentStatusBadge(incident.status)}</TableCell>
                        <TableCell className="text-right">
                          {incident.status === 'open' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => acknowledgeIncident.mutate(incident.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Integration Errors</CardTitle>
                <CardDescription>Webhook failures, retries en dead-letter queue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Webhook className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Webhook Failures</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">3</p>
                      <p className="text-xs text-muted-foreground">Laatste 24u</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Pending Retries</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">1</p>
                      <p className="text-xs text-muted-foreground">In queue</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Dead Letter</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">0</p>
                      <p className="text-xs text-muted-foreground">Gefaalde items</p>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Integration</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Laatste Poging</TableHead>
                      <TableHead>Fout</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Exact Online Webhook</TableCell>
                      <TableCell>invoice.created</TableCell>
                      <TableCell>3/5</TableCell>
                      <TableCell className="text-muted-foreground">10 min geleden</TableCell>
                      <TableCell className="text-red-600 text-sm">Connection timeout</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" disabled>
                          Retry (niet beschikbaar)
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="client-errors" className="mt-4 space-y-4">
            {/* Error Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5 text-destructive" />
                  Client Error Overzicht (24u)
                </CardTitle>
                <CardDescription>Gegroepeerde frontend errors — meest voorkomend bovenaan</CardDescription>
              </CardHeader>
              <CardContent>
                {!errorSummary?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-medium">Geen client errors in de laatste 24 uur</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Error</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Aantal</TableHead>
                        <TableHead>Laatst gezien</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorSummary.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="max-w-xs truncate font-mono text-xs">
                            {item.error_message}
                          </TableCell>
                          <TableCell>
                            {item.component_name ? (
                              <Badge variant="outline" className="font-mono text-xs">{item.component_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.count >= 10 ? 'destructive' : 'outline'} className={item.count >= 10 ? '' : 'bg-muted'}>
                              {item.count}×
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(item.last_seen), 'dd MMM HH:mm', { locale: nl })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Error Log */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Error Log</CardTitle>
                <CardDescription>Laatste 100 individuele error meldingen</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingErrors ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !errorLogs?.length ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Geen errors gevonden</p>
                ) : (
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tijd</TableHead>
                          <TableHead>Component</TableHead>
                          <TableHead>Error</TableHead>
                          <TableHead>URL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errorLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), 'dd MMM HH:mm:ss', { locale: nl })}
                            </TableCell>
                            <TableCell>
                              {log.component_name ? (
                                <Badge variant="outline" className="font-mono text-xs">{log.component_name}</Badge>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="max-w-sm">
                              <details>
                                <summary className="cursor-pointer text-xs font-mono truncate max-w-xs">
                                  {log.error_message.slice(0, 80)}
                                </summary>
                                <pre className="mt-2 text-xs bg-muted p-2 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap">
                                  {log.error_message}
                                  {log.error_stack && `\n\n${log.error_stack}`}
                                </pre>
                              </details>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                              {log.url ? new URL(log.url).pathname : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SystemHealth;
