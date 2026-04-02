import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Edit, Trash2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Template {
  id: string;
  name: string;
  description: string | null;
  default_vehicle_type: string | null;
  default_deadline_hours: number | null;
  default_pool_id: string | null;
  is_active: boolean | null;
  company_id: string;
}

const TenderTemplates = () => {
  const navigate = useNavigate();
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    vehicleType: "",
    deadlineHours: 24,
    defaultPool: "",
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['tender_templates', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('tender_templates')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Template[];
    },
    enabled: !!company?.id,
  });

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newTemplate.name || !company?.id) {
      toast.error("Vul een naam in");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('tender_templates')
      .insert({
        company_id: company.id,
        name: newTemplate.name,
        description: newTemplate.description || null,
        default_vehicle_type: newTemplate.vehicleType || null,
        default_deadline_hours: newTemplate.deadlineHours,
      });
    setSaving(false);
    if (error) {
      toast.error("Kon template niet aanmaken");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['tender_templates'] });
    toast.success("Template succesvol aangemaakt");
    setNewTemplate({ name: "", description: "", vehicleType: "", deadlineHours: 24, defaultPool: "" });
    setIsCreateOpen(false);
  };

  const handleDuplicate = async (template: Template) => {
    if (!company?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('tender_templates')
      .insert({
        company_id: company.id,
        name: `${template.name} (kopie)`,
        description: template.description,
        default_vehicle_type: template.default_vehicle_type,
        default_deadline_hours: template.default_deadline_hours,
        default_pool_id: template.default_pool_id,
        is_active: template.is_active,
      });
    setSaving(false);
    if (error) {
      toast.error("Kon template niet dupliceren");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['tender_templates'] });
    toast.success(`Template "${template.name}" gedupliceerd`);
  };

  const handleEdit = (template: Template) => {
    setEditTemplate({ ...template });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTemplate) return;
    setSaving(true);
    const { error } = await supabase
      .from('tender_templates')
      .update({
        name: editTemplate.name,
        description: editTemplate.description,
        default_vehicle_type: editTemplate.default_vehicle_type,
        default_deadline_hours: editTemplate.default_deadline_hours,
      })
      .eq('id', editTemplate.id);
    setSaving(false);
    if (error) {
      toast.error("Kon template niet opslaan");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['tender_templates'] });
    toast.success(`Template "${editTemplate.name}" opgeslagen`);
    setIsEditOpen(false);
    setEditTemplate(null);
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    setSaving(true);
    const { error } = await supabase
      .from('tender_templates')
      .delete()
      .eq('id', deleteTemplate.id);
    setSaving(false);
    if (error) {
      toast.error("Kon template niet verwijderen");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['tender_templates'] });
    toast.success(`Template "${deleteTemplate.name}" verwijderd`);
    setDeleteTemplate(null);
  };

  return (
    <DashboardLayout title="Tender Templates">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle>Tender Templates</CardTitle>
                <CardDescription>Herbruikbare sjablonen voor snelle tenderaanmaak</CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nieuwe Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nieuwe Template</DialogTitle>
                    <DialogDescription>Maak een herbruikbaar sjabloon voor tenders.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Naam</Label>
                      <Input
                        placeholder="bijv. Standaard Binnenland"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Beschrijving</Label>
                      <Textarea
                        placeholder="Korte beschrijving van het template..."
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Voertuigtype</Label>
                      <Select value={newTemplate.vehicleType} onValueChange={(v) => setNewTemplate({ ...newTemplate, vehicleType: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer voertuig" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bestelbus">Bestelbus</SelectItem>
                          <SelectItem value="vrachtwagen">Vrachtwagen</SelectItem>
                          <SelectItem value="bakwagen">Bakwagen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Standaard Deadline (uren)</Label>
                      <Input
                        type="number"
                        placeholder="24"
                        value={newTemplate.deadlineHours}
                        onChange={(e) => setNewTemplate({ ...newTemplate, deadlineHours: parseInt(e.target.value) || 24 })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuleren</Button>
                    <Button onClick={handleCreate} disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Template Opslaan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Voertuig</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-muted-foreground">{template.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{template.default_vehicle_type || '-'}</TableCell>
                        <TableCell>{template.default_deadline_hours ? `${template.default_deadline_hours} uur` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={template.is_active !== false ? "default" : "secondary"}>
                            {template.is_active !== false ? "Actief" : "Inactief"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)} title="Dupliceren" disabled={saving}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(template)} title="Bewerken">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTemplate(template)} title="Verwijderen">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTemplates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Geen templates gevonden. Maak een nieuw template aan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Template Bewerken</DialogTitle>
              <DialogDescription>Wijzig de instellingen van dit template.</DialogDescription>
            </DialogHeader>
            {editTemplate && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Naam</Label>
                  <Input 
                    value={editTemplate.name}
                    onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Beschrijving</Label>
                  <Textarea 
                    value={editTemplate.description || ''}
                    onChange={(e) => setEditTemplate({ ...editTemplate, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Voertuigtype</Label>
                  <Select 
                    value={editTemplate.default_vehicle_type || ''}
                    onValueChange={(v) => setEditTemplate({ ...editTemplate, default_vehicle_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bestelbus">Bestelbus</SelectItem>
                      <SelectItem value="vrachtwagen">Vrachtwagen</SelectItem>
                      <SelectItem value="bakwagen">Bakwagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Standaard Deadline (uren)</Label>
                  <Input 
                    type="number" 
                    value={editTemplate.default_deadline_hours || 24}
                    onChange={(e) => setEditTemplate({ ...editTemplate, default_deadline_hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuleren</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Opslaan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Template verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Weet je zeker dat je "{deleteTemplate?.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default TenderTemplates;
