import { useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Zap, Play, Square, CheckCircle2, XCircle, Loader2,
  Timer, Database, BarChart3, Trash2, AlertTriangle, TrendingUp
} from "lucide-react";

interface BenchmarkResult {
  id: string;
  name: string;
  category: "crud" | "query" | "concurrent" | "volume";
  status: "pending" | "running" | "pass" | "fail" | "warning";
  opsPerSecond?: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  totalOps?: number;
  duration?: number;
  error?: string;
  details?: string;
}

const BATCH_SIZES = [10, 25, 50, 100, 250];

const StressTest = () => {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [batchSize, setBatchSize] = useState(25);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const abortRef = useRef(false);

  const updateResult = (id: string, update: Partial<BenchmarkResult>) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...update } : r));
  };

  const addResult = (result: BenchmarkResult) => {
    setResults(prev => [...prev, result]);
  };

  const measureLatencies = (times: number[]) => {
    const sorted = [...times].sort((a, b) => a - b);
    return {
      avgLatencyMs: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
      p95LatencyMs: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    };
  };

  // ── Benchmark: Batch INSERT trips ──
  const benchBatchInsert = async (): Promise<BenchmarkResult> => {
    const id = "batch-insert-trips";
    const result: BenchmarkResult = { id, name: `Batch INSERT (${batchSize} trips)`, category: "crud", status: "running" };
    addResult(result);
    setCurrentTest(id);

    const latencies: number[] = [];
    const createdIds: string[] = [];
    const start = performance.now();

    try {
      for (let i = 0; i < batchSize; i++) {
        if (abortRef.current) throw new Error("Afgebroken");
        const opStart = performance.now();
        const { data, error } = await supabase.from("trips").insert({
          customer_name: `StressTest-${Date.now()}-${i}`,
          pickup_address: `Stress Pickup ${i}`,
          pickup_city: "Amsterdam",
          delivery_address: `Stress Delivery ${i}`,
          delivery_city: "Rotterdam",
          trip_date: new Date().toISOString().split("T")[0],
          status: "gepland",
          cargo_description: `Stress test lading ${i}`,
        }).select("id").single();
        latencies.push(performance.now() - opStart);
        if (error) throw error;
        if (data) createdIds.push(data.id);
      }

      const duration = Math.round(performance.now() - start);
      const { avgLatencyMs, p95LatencyMs } = measureLatencies(latencies);
      const opsPerSecond = Math.round((batchSize / duration) * 1000);

      const updated: BenchmarkResult = {
        ...result,
        status: avgLatencyMs < 500 ? "pass" : avgLatencyMs < 1000 ? "warning" : "fail",
        opsPerSecond, avgLatencyMs, p95LatencyMs, totalOps: batchSize, duration,
        details: `${createdIds.length} records aangemaakt`,
      };
      updateResult(id, updated);

      // Cleanup
      for (const cid of createdIds) {
        await supabase.from("trips").delete().eq("id", cid);
      }

      return updated;
    } catch (e: any) {
      // Cleanup on error
      for (const cid of createdIds) {
        await supabase.from("trips").delete().eq("id", cid);
      }
      const updated = { ...result, status: "fail" as const, error: e.message, duration: Math.round(performance.now() - start) };
      updateResult(id, updated);
      return updated;
    }
  };

  // ── Benchmark: Batch READ performance ──
  const benchBatchRead = async (): Promise<BenchmarkResult> => {
    const id = "batch-read-trips";
    const result: BenchmarkResult = { id, name: `Batch SELECT (${batchSize} queries)`, category: "query", status: "running" };
    addResult(result);
    setCurrentTest(id);

    const latencies: number[] = [];
    const start = performance.now();

    try {
      for (let i = 0; i < batchSize; i++) {
        if (abortRef.current) throw new Error("Afgebroken");
        const opStart = performance.now();
        const { error } = await supabase.from("trips").select("id, order_number, status, customer_name").limit(20);
        latencies.push(performance.now() - opStart);
        if (error) throw error;
      }

      const duration = Math.round(performance.now() - start);
      const { avgLatencyMs, p95LatencyMs } = measureLatencies(latencies);
      const opsPerSecond = Math.round((batchSize / duration) * 1000);

      const updated: BenchmarkResult = {
        ...result,
        status: avgLatencyMs < 200 ? "pass" : avgLatencyMs < 500 ? "warning" : "fail",
        opsPerSecond, avgLatencyMs, p95LatencyMs, totalOps: batchSize, duration,
      };
      updateResult(id, updated);
      return updated;
    } catch (e: any) {
      const updated = { ...result, status: "fail" as const, error: e.message };
      updateResult(id, updated);
      return updated;
    }
  };

  // ── Benchmark: Complex JOIN query ──
  const benchComplexQuery = async (): Promise<BenchmarkResult> => {
    const id = "complex-join-query";
    const result: BenchmarkResult = { id, name: "Complex JOIN query (trips+customers+drivers)", category: "query", status: "running" };
    addResult(result);
    setCurrentTest(id);

    const latencies: number[] = [];
    const iterations = Math.min(batchSize, 20);
    const start = performance.now();

    try {
      for (let i = 0; i < iterations; i++) {
        if (abortRef.current) throw new Error("Afgebroken");
        const opStart = performance.now();
        const { error } = await supabase
          .from("trips")
          .select(`
            id, order_number, status, trip_date, sales_total, purchase_total,
            customers(company_name, city),
            drivers(name, phone),
            vehicles(license_plate, brand)
          `)
          .order("trip_date", { ascending: false })
          .limit(50);
        latencies.push(performance.now() - opStart);
        if (error) throw error;
      }

      const duration = Math.round(performance.now() - start);
      const { avgLatencyMs, p95LatencyMs } = measureLatencies(latencies);

      const updated: BenchmarkResult = {
        ...result,
        status: avgLatencyMs < 300 ? "pass" : avgLatencyMs < 800 ? "warning" : "fail",
        avgLatencyMs, p95LatencyMs, totalOps: iterations, duration,
        opsPerSecond: Math.round((iterations / duration) * 1000),
      };
      updateResult(id, updated);
      return updated;
    } catch (e: any) {
      const updated = { ...result, status: "fail" as const, error: e.message };
      updateResult(id, updated);
      return updated;
    }
  };

  // ── Benchmark: Concurrent reads ──
  const benchConcurrentReads = async (): Promise<BenchmarkResult> => {
    const id = "concurrent-reads";
    const concurrency = Math.min(batchSize, 20);
    const result: BenchmarkResult = { id, name: `Concurrent reads (${concurrency} parallel)`, category: "concurrent", status: "running" };
    addResult(result);
    setCurrentTest(id);

    const start = performance.now();

    try {
      const promises = Array.from({ length: concurrency }, (_, i) =>
        supabase.from("trips").select("id, status").limit(10)
      );

      const results = await Promise.allSettled(promises);
      const duration = Math.round(performance.now() - start);
      const failed = results.filter(r => r.status === "rejected").length;

      const updated: BenchmarkResult = {
        ...result,
        status: failed === 0 ? (duration < 3000 ? "pass" : "warning") : "fail",
        totalOps: concurrency,
        duration,
        opsPerSecond: Math.round((concurrency / duration) * 1000),
        avgLatencyMs: Math.round(duration / concurrency),
        details: `${concurrency - failed}/${concurrency} succesvol in ${duration}ms`,
      };
      updateResult(id, updated);
      return updated;
    } catch (e: any) {
      const updated = { ...result, status: "fail" as const, error: e.message };
      updateResult(id, updated);
      return updated;
    }
  };

  // ── Benchmark: Cross-table concurrent ──
  const benchCrossTable = async (): Promise<BenchmarkResult> => {
    const id = "cross-table-concurrent";
    const result: BenchmarkResult = { id, name: "Cross-table concurrent reads (6 tabellen)", category: "concurrent", status: "running" };
    addResult(result);
    setCurrentTest(id);

    const start = performance.now();

    try {
      const [trips, customers, drivers, vehicles, invoices, routeStops] = await Promise.all([
        supabase.from("trips").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("drivers").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase.from("route_stops").select("id", { count: "exact", head: true }),
      ]);

      const duration = Math.round(performance.now() - start);
      const errors = [trips, customers, drivers, vehicles, invoices, routeStops].filter(r => r.error);

      const updated: BenchmarkResult = {
        ...result,
        status: errors.length === 0 ? (duration < 2000 ? "pass" : "warning") : "fail",
        totalOps: 6,
        duration,
        avgLatencyMs: Math.round(duration / 6),
        details: `trips:${trips.count ?? 0} cust:${customers.count ?? 0} drivers:${drivers.count ?? 0} vehicles:${vehicles.count ?? 0} inv:${invoices.count ?? 0} stops:${routeStops.count ?? 0}`,
        error: errors.length > 0 ? errors.map(e => e.error?.message).join("; ") : undefined,
      };
      updateResult(id, updated);
      return updated;
    } catch (e: any) {
      const updated = { ...result, status: "fail" as const, error: e.message };
      updateResult(id, updated);
      return updated;
    }
  };

  // ── Benchmark: Update + Delete cycle ──
  const benchUpdateDelete = async (): Promise<BenchmarkResult> => {
    const id = "update-delete-cycle";
    const count = Math.min(batchSize, 25);
    const result: BenchmarkResult = { id, name: `UPDATE+DELETE cycle (${count} records)`, category: "crud", status: "running" };
    addResult(result);
    setCurrentTest(id);

    const latencies: number[] = [];
    const start = performance.now();
    const createdIds: string[] = [];

    try {
      // Create
      for (let i = 0; i < count; i++) {
        const { data } = await supabase.from("trips").insert({
          customer_name: `StressUD-${i}`,
          pickup_address: "Test", pickup_city: "Amsterdam",
          delivery_address: "Test", delivery_city: "Rotterdam",
          trip_date: new Date().toISOString().split("T")[0],
          status: "gepland",
        }).select("id").single();
        if (data) createdIds.push(data.id);
      }

      // Update
      for (const cid of createdIds) {
        if (abortRef.current) throw new Error("Afgebroken");
        const opStart = performance.now();
        await supabase.from("trips").update({ status: "onderweg", cargo_description: "Updated by stress test" }).eq("id", cid);
        latencies.push(performance.now() - opStart);
      }

      // Delete
      for (const cid of createdIds) {
        await supabase.from("trips").delete().eq("id", cid);
      }

      const duration = Math.round(performance.now() - start);
      const { avgLatencyMs, p95LatencyMs } = measureLatencies(latencies);

      const updated: BenchmarkResult = {
        ...result,
        status: avgLatencyMs < 300 ? "pass" : avgLatencyMs < 700 ? "warning" : "fail",
        avgLatencyMs, p95LatencyMs, totalOps: count * 3, duration,
        opsPerSecond: Math.round(((count * 3) / duration) * 1000),
        details: `${count} create + ${count} update + ${count} delete`,
      };
      updateResult(id, updated);
      return updated;
    } catch (e: any) {
      for (const cid of createdIds) {
        await supabase.from("trips").delete().eq("id", cid);
      }
      const updated = { ...result, status: "fail" as const, error: e.message };
      updateResult(id, updated);
      return updated;
    }
  };

  // ── Benchmark: RLS performance ──
  const benchRLSPerformance = async (): Promise<BenchmarkResult> => {
    const id = "rls-performance";
    const result: BenchmarkResult = { id, name: "RLS-filtered query performance", category: "query", status: "running" };
    addResult(result);
    setCurrentTest(id);

    const latencies: number[] = [];
    const iterations = Math.min(batchSize, 15);
    const start = performance.now();

    try {
      for (let i = 0; i < iterations; i++) {
        if (abortRef.current) throw new Error("Afgebroken");
        const opStart = performance.now();
        // This query passes through RLS policies on every table
        await supabase.from("trips").select("id, status, customers(company_name)").eq("status", "gepland").limit(50);
        latencies.push(performance.now() - opStart);
      }

      const duration = Math.round(performance.now() - start);
      const { avgLatencyMs, p95LatencyMs } = measureLatencies(latencies);

      const updated: BenchmarkResult = {
        ...result,
        status: avgLatencyMs < 250 ? "pass" : avgLatencyMs < 600 ? "warning" : "fail",
        avgLatencyMs, p95LatencyMs, totalOps: iterations, duration,
        opsPerSecond: Math.round((iterations / duration) * 1000),
        details: `Filtered queries door RLS policies`,
      };
      updateResult(id, updated);
      return updated;
    } catch (e: any) {
      const updated = { ...result, status: "fail" as const, error: e.message };
      updateResult(id, updated);
      return updated;
    }
  };

  // ── Run all benchmarks ──
  const runAllBenchmarks = useCallback(async () => {
    setRunning(true);
    setResults([]);
    abortRef.current = false;

    const benchmarks = [
      benchBatchInsert,
      benchBatchRead,
      benchComplexQuery,
      benchConcurrentReads,
      benchCrossTable,
      benchUpdateDelete,
      benchRLSPerformance,
    ];

    let passed = 0;
    for (const bench of benchmarks) {
      if (abortRef.current) break;
      const result = await bench();
      if (result.status === "pass") passed++;
    }

    setCurrentTest(null);
    setRunning(false);
    toast.success(`Stress test voltooid: ${passed}/${benchmarks.length} geslaagd`);
  }, [batchSize]);

  const stopTests = () => {
    abortRef.current = true;
    toast.info("Tests worden gestopt...");
  };

  const clearResults = () => {
    setResults([]);
  };

  const passedCount = results.filter(r => r.status === "pass").length;
  const warningCount = results.filter(r => r.status === "warning").length;
  const failedCount = results.filter(r => r.status === "fail").length;

  const statusIcon = (status: BenchmarkResult["status"]) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "fail": return <XCircle className="h-5 w-5 text-destructive" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "running": return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default: return <Timer className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: BenchmarkResult["status"]) => {
    switch (status) {
      case "pass": return <Badge className="bg-success/10 text-success border-success/20">PASS</Badge>;
      case "fail": return <Badge variant="destructive">FAIL</Badge>;
      case "warning": return <Badge className="bg-warning/10 text-warning border-warning/20">SLOW</Badge>;
      case "running": return <Badge variant="secondary">Bezig...</Badge>;
      default: return <Badge variant="outline">Wacht</Badge>;
    }
  };

  return (
    <DashboardLayout title="Stress Test" description="Performance benchmarks en belastingstest">
      <div
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Stress Test & Benchmarks
            </h1>
            <p className="text-muted-foreground">
              Meet database performance, concurrency en RLS overhead
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(batchSize)} onValueChange={(v) => setBatchSize(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BATCH_SIZES.map(size => (
                  <SelectItem key={size} value={String(size)}>{size} ops</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {running ? (
              <Button variant="destructive" onClick={stopTests}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button onClick={runAllBenchmarks} className="gap-2">
                <Play className="h-4 w-4" />
                Start Stress Test
              </Button>
            )}
            {results.length > 0 && !running && (
              <Button variant="ghost" size="icon" onClick={clearResults}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tests</p>
                    <p className="text-2xl font-bold">{results.length}</p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Geslaagd</p>
                    <p className="text-2xl font-bold text-success">{passedCount}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Traag</p>
                    <p className="text-2xl font-bold text-warning">{warningCount}</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Gefaald</p>
                    <p className="text-2xl font-bold text-destructive">{failedCount}</p>
                  </div>
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress */}
        {running && currentTest && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {results.find(r => r.id === currentTest)?.name ?? "Test uitvoeren..."}
                  </p>
                  <Progress value={(results.filter(r => r.status !== "pending" && r.status !== "running").length / 7) * 100} className="h-2 mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Benchmark Resultaten
              </CardTitle>
              <CardDescription>
                Performance metrics per test — groen: goed, oranje: traag, rood: te traag
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {statusIcon(r.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{r.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {r.avgLatencyMs !== undefined && (
                            <span>Gem: <strong>{r.avgLatencyMs}ms</strong></span>
                          )}
                          {r.p95LatencyMs !== undefined && (
                            <span>P95: <strong>{r.p95LatencyMs}ms</strong></span>
                          )}
                          {r.opsPerSecond !== undefined && (
                            <span>Ops/s: <strong>{r.opsPerSecond}</strong></span>
                          )}
                          {r.totalOps !== undefined && (
                            <span>Totaal: <strong>{r.totalOps}</strong></span>
                          )}
                          {r.duration !== undefined && (
                            <span>Duur: <strong>{r.duration}ms</strong></span>
                          )}
                        </div>
                        {r.details && (
                          <p className="text-xs text-muted-foreground mt-0.5">{r.details}</p>
                        )}
                        {r.error && (
                          <p className="text-xs text-destructive mt-0.5">{r.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 shrink-0">
                      {statusBadge(r.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {results.length === 0 && !running && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Geen benchmarks uitgevoerd</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Selecteer het aantal operaties en klik "Start Stress Test" om
                database performance, concurrency en RLS overhead te meten.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>CRUD</strong> — Batch insert, update, delete cyclus</p>
                <p>• <strong>Query</strong> — SELECT, JOIN, gefilterde queries</p>
                <p>• <strong>Concurrent</strong> — Parallelle reads over meerdere tabellen</p>
                <p>• <strong>RLS</strong> — Performance overhead van Row-Level Security</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StressTest;
