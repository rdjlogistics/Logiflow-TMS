import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  Save,
  Loader2,
  FileCheck,
  Truck,
  Receipt,
  Package,
  ClipboardCheck
} from 'lucide-react';
import { useDocumentTemplates, DocumentTemplate, DocumentTemplateType } from '@/hooks/useDocumentTemplates';

type DocumentType = DocumentTemplateType;

const TEMPLATE_TYPE_CONFIG: Record<DocumentType, { label: string; icon: typeof FileText; color: string }> = {
  cmr: { label: 'CMR Vrachtbrief', icon: Truck, color: 'bg-blue-500' },
  vrachtbrief: { label: 'Vrachtbrief', icon: FileText, color: 'bg-green-500' },
  pod: { label: 'Proof of Delivery', icon: ClipboardCheck, color: 'bg-purple-500' },
  invoice: { label: 'Factuur', icon: Receipt, color: 'bg-amber-500' },
  quote: { label: 'Offerte', icon: FileCheck, color: 'bg-cyan-500' },
  packing_list: { label: 'Paklijst', icon: Package, color: 'bg-orange-500' },
  delivery_note: { label: 'Afleverbon', icon: FileText, color: 'bg-pink-500' },
};

const DocumentTemplates = () => {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useDocumentTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DocumentTemplate>>({});
  const [activeTab, setActiveTab] = useState<DocumentType | 'all'>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);

  const filteredTemplates = activeTab === 'all' 
    ? templates 
    : templates.filter(t => t.template_type === activeTab);

  const handleCreate = () => {
    setEditForm({
      name: '',
      template_type: 'cmr',
      content_html: '',
      is_active: true,
      is_default: false,
      variables_schema: [],
    });
    setIsEditing(true);
    setSelectedTemplate(null);
  };

  const handleEdit = (template: DocumentTemplate) => {
    setEditForm(template);
    setIsEditing(true);
    setSelectedTemplate(template);
  };

  const handleSave = async () => {
    if (selectedTemplate) {
      updateTemplate.mutate({ id: selectedTemplate.id, ...editForm });
    } else {
      createTemplate.mutate(editForm as any);
    }
    setIsEditing(false);
    setEditForm({});
  };

  const handleDelete = async () => {
    if (templateToDelete) {
      deleteTemplate.mutate(templateToDelete.id);
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
    }
  };

  const handleDuplicate = async (template: DocumentTemplate) => {
    // Create a copy with a new name
    createTemplate.mutate({
      name: `${template.name} (kopie)`,
      template_type: template.template_type,
      content_html: template.content_html,
      is_active: template.is_active,
      is_default: false,
      variables_schema: template.variables_schema,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Document Templates">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Document Templates" description="Beheer templates voor CMR, facturen en andere documenten">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>Document Templates</span>
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm hidden sm:block">
              Maak en beheer document templates met dynamische variabelen
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuwe Template
          </Button>
        </div>

        {/* Type Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentType | 'all')}>
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="gap-2">
              Alle
              <Badge variant="secondary" className="ml-1">{templates.length}</Badge>
            </TabsTrigger>
            {Object.entries(TEMPLATE_TYPE_CONFIG).map(([type, config]) => {
              const count = templates.filter(t => t.template_type === type).length;
              return (
                <TabsTrigger key={type} value={type} className="gap-2">
                  <config.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  {count > 0 && <Badge variant="secondary" className="ml-1">{count}</Badge>}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Templates Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template) => {
              const config = TEMPLATE_TYPE_CONFIG[template.template_type as DocumentType] || TEMPLATE_TYPE_CONFIG.cmr;
              return (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="group hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg ${config.color} flex items-center justify-center`}>
                            <config.icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {config.label}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Actief' : 'Inactief'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-3 w-3" />
                          Bewerken
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setTemplateToDelete(template);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredTemplates.length === 0 && (
            <div className="col-span-full text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Geen templates gevonden</h3>
              <p className="text-muted-foreground mb-4">
                Maak een nieuwe template om te beginnen
              </p>
              <Button onClick={handleCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Nieuwe Template
              </Button>
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? 'Template Bewerken' : 'Nieuwe Template'}
              </DialogTitle>
              <DialogDescription>
                Configureer de template met HTML en dynamische variabelen
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Naam</Label>
                  <Input
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Standaard CMR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editForm.template_type}
                    onValueChange={(v) => setEditForm({ ...editForm, template_type: v as DocumentType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEMPLATE_TYPE_CONFIG).map(([type, config]) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={editForm.is_active ?? true}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                />
                <Label htmlFor="active">Template is actief</Label>
              </div>

              <div className="space-y-2">
                <Label>Template HTML</Label>
                <Textarea
                  value={editForm.content_html || ''}
                  onChange={(e) => setEditForm({ ...editForm, content_html: e.target.value })}
                  placeholder="<html>...</html>"
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Beschikbare Variabelen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      '{{order_number}}',
                      '{{customer_name}}',
                      '{{customer_address}}',
                      '{{pickup_address}}',
                      '{{delivery_address}}',
                      '{{pickup_date}}',
                      '{{delivery_date}}',
                      '{{driver_name}}',
                      '{{vehicle_plate}}',
                      '{{goods_description}}',
                      '{{weight_kg}}',
                      '{{company_name}}',
                      '{{company_logo}}',
                      '{{today_date}}',
                    ].map((variable) => (
                      <code 
                        key={variable} 
                        className="bg-background px-2 py-1 rounded cursor-pointer hover:bg-primary/10"
                        onClick={() => {
                          const textarea = document.querySelector('textarea');
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const newValue = 
                              (editForm.content_html || '').substring(0, start) + 
                              variable + 
                              (editForm.content_html || '').substring(end);
                            setEditForm({ ...editForm, content_html: newValue });
                          }
                        }}
                      >
                        {variable}
                      </code>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Opslaan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Template Verwijderen</DialogTitle>
              <DialogDescription>
                Weet je zeker dat je "{templateToDelete?.name}" wilt verwijderen? 
                Deze actie kan niet ongedaan worden gemaakt.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Annuleren
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Verwijderen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DocumentTemplates;
