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
import { Plus, Search, FileText, Edit, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string;
  vehicleType: string;
  deadlineHours: number;
  defaultPool: string;
  usageCount: number;
  isActive: boolean;
}

const initialTemplates: Template[] = [
  {
    id: "1",
    name: "Standaard Binnenland",
    description: "Template voor binnenlandse zendingen",
    vehicleType: "Bestelbus",
    deadlineHours: 24,
    defaultPool: "Regionale Partners",
    usageCount: 45,
    isActive: true,
  },
  {
    id: "2",
    name: "Express Levering",
    description: "Voor spoedopdrachten met korte deadline",
    vehicleType: "Bestelbus",
    deadlineHours: 4,
    defaultPool: "Premium Carriers",
    usageCount: 12,
    isActive: true,
  },
  {
    id: "3",
    name: "Grote Volumes",
    description: "Template voor vrachtwagen transporten",
    vehicleType: "Vrachtwagen",
    deadlineHours: 48,
    defaultPool: "Alle Carriers",
    usageCount: 8,
    isActive: true,
  },
];

const TenderTemplates = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    vehicleType: "",
    deadlineHours: 24,
    defaultPool: "",
  });

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    if (!newTemplate.name) {
      toast.error("Vul een naam in");
      return;
    }
    const created: Template = {
      id: Date.now().toString(),
      ...newTemplate,
      usageCount: 0,
      isActive: true,
    };
    setTemplates([...templates, created]);
    toast.success("Template succesvol aangemaakt");
    setNewTemplate({ name: "", description: "", vehicleType: "", deadlineHours: 24, defaultPool: "" });
    setIsCreateOpen(false);
  };

  const handleDuplicate = (template: Template) => {
    const duplicated: Template = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (kopie)`,
      usageCount: 0,
    };
    setTemplates([...templates, duplicated]);
    toast.success(`Template "${template.name}" gedupliceerd`);
  };

  const handleEdit = (template: Template) => {
    setEditTemplate({ ...template });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editTemplate) return;
    setTemplates(templates.map(t => t.id === editTemplate.id ? editTemplate : t));
    toast.success(`Template "${editTemplate.name}" opgeslagen`);
    setIsEditOpen(false);
    setEditTemplate(null);
  };

  const handleDelete = () => {
    if (!deleteTemplate) return;
    setTemplates(templates.filter(t => t.id !== deleteTemplate.id));
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
                      <Input placeholder="bijv. Standaard Binnenland" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Beschrijving</Label>
                      <Textarea placeholder="Korte beschrijving van het template..." />
                    </div>
                    <div className="grid gap-2">
                      <Label>Voertuigtype</Label>
                      <Select>
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
                      <Input type="number" placeholder="24" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Standaard Carrier Pool</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer pool" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="premium">Premium Carriers</SelectItem>
                          <SelectItem value="regional">Regionale Partners</SelectItem>
                          <SelectItem value="all">Alle Carriers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuleren</Button>
                    <Button onClick={handleCreate}>Template Opslaan</Button>
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

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Voertuig</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Pool</TableHead>
                    <TableHead>Gebruik</TableHead>
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
                      <TableCell>{template.vehicleType}</TableCell>
                      <TableCell>{template.deadlineHours} uur</TableCell>
                      <TableCell>{template.defaultPool}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{template.usageCount}x</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Actief" : "Inactief"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)} title="Dupliceren">
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
                </TableBody>
              </Table>
            </div>
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
                    value={editTemplate.description}
                    onChange={(e) => setEditTemplate({ ...editTemplate, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Voertuigtype</Label>
                  <Select 
                    value={editTemplate.vehicleType.toLowerCase().replace(" ", "")}
                    onValueChange={(v) => setEditTemplate({ ...editTemplate, vehicleType: v === "bestelbus" ? "Bestelbus" : v === "vrachtwagen" ? "Vrachtwagen" : "Bakwagen" })}
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
                    value={editTemplate.deadlineHours}
                    onChange={(e) => setEditTemplate({ ...editTemplate, deadlineHours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Standaard Carrier Pool</Label>
                  <Select 
                    value={editTemplate.defaultPool.toLowerCase().replace(" ", "")}
                    onValueChange={(v) => setEditTemplate({ ...editTemplate, defaultPool: v === "premium" ? "Premium Carriers" : v === "regional" ? "Regionale Partners" : "Alle Carriers" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium Carriers</SelectItem>
                      <SelectItem value="regional">Regionale Partners</SelectItem>
                      <SelectItem value="all">Alle Carriers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuleren</Button>
              <Button onClick={handleSaveEdit}>Opslaan</Button>
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
