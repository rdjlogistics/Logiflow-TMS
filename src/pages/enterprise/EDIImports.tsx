import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Upload, Loader2, CheckCircle, Save, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const EDIImports = () => {
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState<{ rows: number; fields: string[]; data: Record<string, unknown>[] } | null>(null);
  const { company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch recent imports from queue
  const { data: recentImports = [] } = useQuery({
    queryKey: ["edi-imports", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_ingest_queue")
        .select("id, subject, status, created_at, parsed_data")
        .eq("company_id", company!.id)
        .eq("sender_email", "edi-import")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (parsed: { rows: number; fields: string[]; data: Record<string, unknown>[] }) => {
      const { error } = await supabase.from("email_ingest_queue").insert({
        company_id: company!.id,
        sender_email: "edi-import",
        subject: `CSV Import — ${parsed.rows} rijen`,
        raw_content: JSON.stringify(parsed.data.slice(0, 5)), // preview
        parsed_data: { rows: parsed.rows, fields: parsed.fields, records: parsed.data } as any,
        status: "parsed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-imports"] });
      toast({ title: "Import opgeslagen ✓", description: "Data is opgeslagen in de verwerkingswachtrij." });
      setResults(null);
    },
    onError: (err) => {
      toast({ title: "Opslaan mislukt", description: err instanceof Error ? err.message : "Onbekende fout", variant: "destructive" });
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    onDrop: (files) => {
      if (!files.length) return;
      const file = files[0];
      if (file.name.endsWith(".csv")) {
        setParsing(true);
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            setParsing(false);
            const data = result.data as Record<string, unknown>[];
            setResults({ rows: data.length, fields: result.meta.fields ?? [], data });
            toast({ title: `${data.length} rijen geparsed ✓`, description: `Velden: ${(result.meta.fields ?? []).join(", ")}` });
          },
          error: () => {
            setParsing(false);
            toast({ title: "Parse fout", variant: "destructive" });
          },
        });
      } else {
        toast({ title: "Bestand ontvangen", description: `${file.name} — Excel import wordt voorbereid.` });
      }
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "parsed": return <Badge variant="secondary">Geparsed</Badge>;
      case "processed": return <Badge className="bg-emerald-500/10 text-emerald-500">Verwerkt</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout title="EDI / Imports">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>EDI / Imports</CardTitle>
            </div>
            <CardDescription>CSV/Excel import met automatische veldherkenning en database opslag</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              {parsing ? (
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-3" />
              ) : (
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              )}
              <p className="font-medium">{isDragActive ? "Laat los om te uploaden" : "Sleep bestanden hierheen"}</p>
              <p className="text-sm text-muted-foreground mt-1">CSV of Excel formaat</p>
            </div>

            {results && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <p className="font-medium">{results.rows} rijen gevonden</p>
                  </div>
                  <Button
                    onClick={() => saveMutation.mutate(results)}
                    disabled={saveMutation.isPending || !company?.id}
                    size="sm"
                  >
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Opslaan in Database
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Velden: {results.fields.join(", ")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent imports */}
        {recentImports.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Recente Imports</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentImports.map((imp) => (
                  <div key={imp.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{imp.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(imp.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {statusBadge(imp.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EDIImports;
