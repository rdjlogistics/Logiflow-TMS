import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface TestResult {
  table: string;
  operation: string;
  expected: string;
  actual: string;
  status: "pass" | "fail";
  details?: string;
}

interface TenantTestResponse {
  summary: { total: number; passed: number; failed: number };
  results: TestResult[];
  error?: string;
}

const TenantIsolationTest = () => {
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<TenantTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setRunning(true);
    setError(null);
    setResponse(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("test-tenant-isolation");
      if (fnError) throw fnError;
      setResponse(data as TenantTestResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onbekende fout");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Tenant Isolatie Test
            </CardTitle>
            <CardDescription>
              Verifieert dat data tussen bedrijven volledig gescheiden blijft
            </CardDescription>
          </div>
          <Button onClick={runTest} disabled={running} className="btn-premium">
            {running ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Test Uitvoeren
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
            {error}
          </div>
        )}

        {response && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <Badge variant="outline" className="text-sm px-3 py-1">
                Totaal: {response.summary.total}
              </Badge>
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-sm px-3 py-1">
                ✓ {response.summary.passed} geslaagd
              </Badge>
              {response.summary.failed > 0 && (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  ✗ {response.summary.failed} gefaald
                </Badge>
              )}
            </div>

            {/* Results */}
            <div className="space-y-2">
              {response.results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm"
                >
                  <div className="flex items-center gap-3">
                    {r.status === "pass" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div>
                      <span className="font-medium">{r.table}</span>
                      <span className="text-muted-foreground ml-2">{r.operation}</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">{r.actual}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!response && !error && !running && (
          <p className="text-sm text-muted-foreground">
            Klik op "Test Uitvoeren" om twee test-bedrijven aan te maken en te verifiëren dat RLS policies cross-tenant toegang blokkeren.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantIsolationTest;
