import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecurityDashboardStats } from '@/components/security/SecurityDashboardStats';
import { RlsStatusTab } from '@/components/security/RlsStatusTab';
import { AuditLogTab } from '@/components/security/AuditLogTab';
import { AccessAttemptsTab } from '@/components/security/AccessAttemptsTab';
import { Shield, Database, FileText, Users, Lock, Archive, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditRealtimeAlerts } from '@/hooks/useAuditRealtimeAlerts';
import { useState } from 'react';

const SecurityCenter = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { newEventCount, resetNewEventCount } = useAuditRealtimeAlerts(isAdmin);
  const [activeTab, setActiveTab] = useState('rls');

  if (roleLoading) {
    return (
      <DashboardLayout title="Security Dashboard" description="Laden...">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Security Dashboard" description="Toegangscontrole">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Geen toegang</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Het Security Dashboard is alleen toegankelijk voor administrators. Neem contact op met een beheerder als je toegang nodig hebt.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Security Dashboard" 
      description="Realtime RLS-monitoring, audit logs en toegangscontrole"
    >
      <div className="space-y-6">
        <SecurityDashboardStats />

        <Tabs defaultValue="rls" value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'audit') resetNewEventCount(); >
          <TabsList className="flex-wrap">
            <TabsTrigger value="rls" className="gap-2">
              <Database className="h-4 w-4" />
              RLS Status
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2 relative">
              <FileText className="h-4 w-4" />
              Audit Logs
              {newEventCount > 0 && activeTab !== 'audit' && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-[10px] rounded-full">
                  {newEventCount > 99 ? '99+' : newEventCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-2">
              <Users className="h-4 w-4" />
              Toegang
            </TabsTrigger>
            <TabsTrigger value="legal-holds" className="gap-2">
              <Lock className="h-4 w-4" />
              Legal Holds
            </TabsTrigger>
            <TabsTrigger value="retention" className="gap-2">
              <Archive className="h-4 w-4" />
              Data Retention
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rls" className="mt-4">
            <RlsStatusTab />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <AuditLogTab />
          </TabsContent>

          <TabsContent value="access" className="mt-4">
            <AccessAttemptsTab />
          </TabsContent>

          <TabsContent value="legal-holds" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-500" />
                  Legal Holds
                </CardTitle>
                <CardDescription>
                  Beheer legal holds via het hoofdmenu. Deze tab toont de huidige status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/40">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Legal Holds worden beheerd via Enterprise &gt; Legal Holds</p>
                    <p className="text-xs text-muted-foreground">Records onder een hold kunnen niet worden verwijderd of gewijzigd.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="retention" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-primary" />
                  Data Retention
                  <Badge variant="secondary" className="ml-2">Configuratie</Badge>
                </CardTitle>
                <CardDescription>Retentiebeleid voor verschillende datatypes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'Chat berichten', retention: '365 dagen', archive: '90 dagen' },
                    { type: 'Tracking locaties', retention: '90 dagen', archive: '30 dagen' },
                    { type: 'Documenten', retention: '7 jaar', archive: '1 jaar' },
                    { type: 'Facturen', retention: '7 jaar', archive: '—' },
                  ].map((policy) => (
                    <div key={policy.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                      <span className="text-sm font-medium">{policy.type}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Bewaren: {policy.retention}</span>
                        <span>Archiveren: {policy.archive}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SecurityCenter;
