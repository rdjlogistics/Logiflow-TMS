import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQATests, QATestResult } from "@/hooks/useQATests";

import SystemHealthWidget from "@/components/admin/SystemHealthWidget";
import TenantIsolationTest from "@/components/admin/TenantIsolationTest";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  Database,
  ShieldCheck,
  Activity,
  RefreshCw
} from "lucide-react";

const QAChecklist = () => {
  const { tests, running, runAllTests, runTest } = useQATests();
  

  const getStatusIcon = (status: QATestResult["status"]) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: QATestResult["status"]) => {
    switch (status) {
      case "pass":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">PASS</Badge>;
      case "fail":
        return <Badge variant="destructive">FAIL</Badge>;
      case "running":
        return <Badge variant="secondary">Bezig...</Badge>;
      default:
        return <Badge variant="outline">Wachtend</Badge>;
    }
  };

  const passedCount = tests.filter(t => t.status === "pass").length;
  const totalCount = tests.length;

  return (
    <DashboardLayout title="QA Checklist" description="Test en valideer systeemfunctionaliteit">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="icon-gradient">
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
              </div>
              <span>QA Checklist</span>
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Valideer systeemfunctionaliteit
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={running}
              className="btn-premium"
            >
              {running ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Alle Tests
            </Button>
          </div>
        </div>


        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="premium-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tests Geslaagd</p>
                  <p className="text-3xl font-bold text-green-600">{passedCount}/{totalCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gefaald</p>
                  <p className="text-3xl font-bold text-destructive">
                    {tests.filter(t => t.status === "fail").length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-semibold">
                    {running ? "Bezig..." : passedCount === totalCount ? "Alles OK" : "Actie vereist"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test List */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Functionaliteitstests
            </CardTitle>
            <CardDescription>
              Database operaties en systeemvalidatie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tests.map((test) => (
                <div 
                  key={test.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(test.status)}
                    <div>
                      <p className="font-medium">{test.name}</p>
                      <p className="text-sm text-muted-foreground">{test.description}</p>
                      {test.error && (
                        <p className="text-sm text-destructive mt-1">{test.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {test.duration !== undefined && (
                      <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                    )}
                    {getStatusBadge(test.status)}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => runTest(test.id)}
                      disabled={running || test.status === "running"}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tenant Isolation */}
        <TenantIsolationTest />

        {/* System Health */}
        <SystemHealthWidget />
      </div>
    </DashboardLayout>
  );
};

export default QAChecklist;
