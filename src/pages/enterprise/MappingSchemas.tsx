import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollText, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const MappingSchemas = () => {
  const [templateName, setTemplateName] = useState("");
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["integration-templates", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_templates")
        .select("*")
        .eq("company_id", company!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("integration_templates").insert({
        company_id: company!.id,
        name,
        file_type: "CSV",
        mapping_schema: {},
        default_values: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-templates"] });
      toast({ title: "Template aangemaakt ✓" });
      setTemplateName("");
    },
    onError: (err) => {
      toast({ title: "Fout bij aanmaken", description: err instanceof Error ? err.message : "Onbekende fout", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("integration_templates").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-templates"] });
      toast({ title: "Template verwijderd" });
    },
  });

  const handleCreate = () => {
    if (!templateName.trim()) {
      toast({ title: "Naam vereist", variant: "destructive" });
      return;
    }
    createMutation.mutate(templateName.trim());
  };

  return (
    <DashboardLayout title="Mapping & Schemas">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <CardTitle>Mapping & Schemas</CardTitle>
          </div>
          <CardDescription>Import templates per klant of formaat — opgeslagen in database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-6 border rounded-lg bg-muted/30">
                <ScrollText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">Nog geen templates</p>
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.file_type ?? "CSV"} → orders</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(t.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Template naam (bijv. 'DHL Import')"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="flex-1"
              />
              <Button onClick={handleCreate} disabled={createMutation.isPending || !company?.id}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Aanmaken
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default MappingSchemas;
