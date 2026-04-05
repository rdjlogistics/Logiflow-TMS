import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Upload, Loader2, Clock, RefreshCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const EmailIngest = () => {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ["email-ingest-queue", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_ingest_queue")
        .select("*")
        .eq("company_id", company!.id)
        .neq("sender_email", "edi-import") // exclude EDI imports
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setUploading(true);
      for (const file of files) {
        const content = await file.text();
        const { error } = await supabase.from("email_ingest_queue").insert({
          company_id: company!.id,
          sender_email: "upload",
          subject: file.name,
          raw_content: content.slice(0, 50000), // cap at 50k chars
          status: "received",
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, files) => {
      queryClient.invalidateQueries({ queryKey: ["email-ingest-queue"] });
      toast({ title: `${files.length} bestand(en) opgeslagen`, description: "Bestanden staan in de verwerkingswachtrij." });
      setUploading(false);
    },
    onError: (err) => {
      setUploading(false);
      toast({ title: "Upload mislukt", description: err instanceof Error ? err.message : "Onbekende fout", variant: "destructive" });
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "message/rfc822": [".eml"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    onDrop: (files) => {
      if (!files.length) return;
      uploadMutation.mutate(files);
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "received": return <Badge variant="outline">Ontvangen</Badge>;
      case "processing": return <Badge className="bg-blue-500/10 text-blue-500">Verwerken</Badge>;
      case "parsed": return <Badge variant="secondary">Geparsed</Badge>;
      case "processed": return <Badge className="bg-emerald-500/10 text-emerald-500">Verwerkt</Badge>;
      case "error": return <Badge variant="destructive">Fout</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout title="Email Ingest">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Email Ingest</CardTitle>
            </div>
            <CardDescription>Upload emails en documenten — opgeslagen in verwerkingswachtrij</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-3" />
              ) : (
                <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              )}
              <p className="font-medium">{isDragActive ? "Laat los om te uploaden" : "Sleep email bestanden hierheen"}</p>
              <p className="text-sm text-muted-foreground mt-1">EML, PDF of TXT formaat</p>
              <Button className="mt-4" size="sm" variant="outline" disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" /> Selecteer bestanden
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Queue overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Verwerkingswachtrij</CardTitle>
                <Badge variant="secondary">{queue.length}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Nog geen bestanden in de wachtrij</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.subject || "Geen onderwerp"}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.sender_email !== "upload" && `Van: ${item.sender_email} • `}
                        {new Date(item.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {item.error_message && (
                        <p className="text-xs text-destructive mt-1">{item.error_message}</p>
                      )}
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {statusBadge(item.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmailIngest;
