import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollText, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MappingSchemas = () => {
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<Array<{ name: string; format: string }>>([]);

  const handleCreate = () => {
    if (!templateName.trim()) {
      toast({ title: "Naam vereist", variant: "destructive" });
      return;
    }
    setTemplates((prev) => [...prev, { name: templateName, format: "CSV" }]);
    toast({ title: "Template aangemaakt ✓" });
    setTemplateName("");
  };

  return (
    <DashboardLayout title="Mapping & Schemas">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <CardTitle>Mapping & Schemas</CardTitle>
          </div>
          <CardDescription>Import templates per klant of formaat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.format} → orders</p>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="text-center py-6 border rounded-lg bg-muted/30">
                <ScrollText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">Nog geen templates</p>
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="Template naam (bijv. 'DHL Import')" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="flex-1" />
              <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> Aanmaken</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default MappingSchemas;
