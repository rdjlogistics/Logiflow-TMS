import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { History, CheckCircle, XCircle, Search, TrendingUp, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { LogDetailDialog } from "@/components/enterprise/LogDetailDialog";

const IntegrationLogs = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "failed">("all");
  const [detailLog, setDetailLog] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["integration-logs", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("job_runs")
        .select("*")
        .eq("tenant_id", companyId)
        .order("started_at", { ascending: false })
        .limit(100);

      return data ?? [];
    },
    enabled: !!user,
  });

  const filtered = logs.filter((log: any) => {
    const matchesSearch = !searchQuery || 
      log.job_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.job_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "completed" && log.status === "completed") ||
      (filterStatus === "failed" && log.status === "failed");
    return matchesSearch && matchesStatus;
  });

  const successCount = logs.filter((l: any) => l.status === "completed").length;
  const failedCount = logs.filter((l: any) => l.status === "failed").length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;

  return (
    <DashboardLayout title="Integration Logs">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Totaal</p><p className="text-2xl font-bold">{logs.length}</p></div><History className="h-8 w-8 text-primary" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Succesvol</p><p className="text-2xl font-bold text-emerald-600">{successCount}</p></div><CheckCircle className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Gefaald</p><p className="text-2xl font-bold text-destructive">{failedCount}</p></div><XCircle className="h-8 w-8 text-destructive" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Success rate</p><p className="text-2xl font-bold">{successRate}%</p></div><TrendingUp className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle>Integration Logs</CardTitle>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Zoeken..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
                </div>
                {(["all", "completed", "failed"] as const).map((f) => (
                  <Button key={f} variant={filterStatus === f ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(f)}>
                    {f === "all" ? "Alle" : f === "completed" ? "Success" : "Failed"}
                  </Button>
                ))}
              </div>
            </div>
            <CardDescription>Overzicht van alle integratie- en batch-jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Geen logs gevonden</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((log: any) => {
                  const duration = log.finished_at && log.started_at
                    ? `${((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000).toFixed(1)}s`
                    : "—";

                  return (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => {
                      setDetailLog({
                        id: log.id.slice(0, 8),
                        timestamp: format(new Date(log.started_at), "d MMM yyyy HH:mm:ss", { locale: nl }),
                        type: log.job_type,
                        endpoint: log.job_name ?? "—",
                        status: log.status === "completed" ? "success" : "failed",
                        duration,
                        payload: log.error_message ?? `${log.success_count ?? 0} succesvol verwerkt`,
                      });
                      setDetailOpen(true); }}>
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-2 h-2 rounded-full ${log.status === "completed" ? "bg-emerald-500" : log.status === "failed" ? "bg-destructive" : "bg-amber-500"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.job_type}</Badge>
                            <span className="font-mono text-sm">{log.job_name ?? "—"}</span>
                          </div>
                          {log.error_message && <p className="text-sm text-destructive truncate">{log.error_message}</p>}
                          {log.processed_count != null && (
                            <p className="text-sm text-muted-foreground">
                              {log.success_count ?? 0} succesvol, {log.error_count ?? 0} fouten van {log.processed_count} verwerkt
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{format(new Date(log.started_at), "d MMM HH:mm", { locale: nl })}</p>
                          <p className={`text-sm font-mono ${log.status === "completed" ? "text-emerald-600" : log.status === "failed" ? "text-destructive" : "text-amber-600"}`}>
                            {duration}
                          </p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LogDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        log={detailLog}
      />
    </DashboardLayout>
  );
};

export default IntegrationLogs;
