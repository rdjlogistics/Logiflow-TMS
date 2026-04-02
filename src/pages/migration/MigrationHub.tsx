import { useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Database, Upload, Play, RefreshCcw, CheckCircle2, AlertTriangle, 
  XCircle, FileText, Settings, History, ArrowRightLeft, Shield,
  Plus, Download, Eye, Trash2, Edit, Zap, Merge, FileUp, Loader2, Plug
} from "lucide-react";
import { ProjectOptionsMenu } from "@/components/migration/ProjectOptionsMenu";
import { 
  useMigrationProjects, 
  useMigrationBatches,
  useStagingRecordsByProject,
  useStagingStats,
  useReconciliationIssues,
  useDualRunSync,
  useMigrationMutations,
  useMigrationProfiles,
  useMigrationConnectors,
  TMS_SYSTEMS,
  type MigrationProject,
  type StagingRecord,
  type SourceSystem,
  type StagingEntityType,
} from "@/hooks/useMigrationEngine";
import { ApiConnectorPanel } from "@/components/migration/ApiConnectorPanel";
import { useCompany } from "@/hooks/useCompany";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

const statusConfig = {
  DRAFT: { label: "Concept", variant: "secondary" as const },
  RUNNING: { label: "Actief", variant: "default" as const },
  DUAL_RUN: { label: "Dual-Run", variant: "default" as const },
  CUTOVER_READY: { label: "Cutover Klaar", variant: "default" as const },
  CUTOVER_DONE: { label: "Voltooid", variant: "default" as const },
  ROLLED_BACK: { label: "Teruggedraaid", variant: "destructive" as const },
};

const stagingStatusConfig: Record<string, { label: string; className: string }> = {
  READY: { label: "Gereed", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  ERROR: { label: "Fout", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  DUPLICATE: { label: "Duplicaat", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  IGNORED: { label: "Genegeerd", className: "bg-muted text-muted-foreground border-border" },
  IMPORTED: { label: "Geïmporteerd", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  CUSTOMER: "Klanten",
  ADDRESS: "Adressen",
  VEHICLE: "Voertuigen",
  ORDER: "Orders",
  INVOICE: "Facturen",
  TRANSACTION: "Transacties",
   CARRIER: "Charters",
   DRIVER: "Eigen Chauffeurs",
  PRODUCT: "Producten",
  DOC: "Documenten",
};

// Validation rules for different entity types
function validateRecord(data: Record<string, any>, entityType: string): string[] {
  const errors: string[] = [];
  
  switch (entityType) {
    case 'CUSTOMER':
      if (!data.company_name?.trim()) errors.push("Bedrijfsnaam is verplicht");
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Ongeldig email formaat");
      if (data.postal_code && !/^\d{4}\s?[A-Za-z]{2}$/.test(data.postal_code)) errors.push("Ongeldig postcode formaat");
      break;
    case 'ADDRESS':
      if (!data.label?.trim()) errors.push("Label is verplicht");
      if (!data.street?.trim()) errors.push("Straat is verplicht");
      break;
    case 'VEHICLE':
      if (!data.license_plate?.trim()) errors.push("Kenteken is verplicht");
      break;
    case 'ORDER':
      if (!data.order_number?.trim() && !data.reference?.trim()) errors.push("Referentie is verplicht");
      break;
    case 'INVOICE':
      if (!data.invoice_number?.trim()) errors.push("Factuurnummer is verplicht");
      if (data.total_amount && isNaN(Number(data.total_amount))) errors.push("Totaalbedrag moet een nummer zijn");
      break;
  }
  
  return errors;
}

// Generate dedupe key for an entity
function generateDedupeKey(data: Record<string, any>, entityType: string): string | null {
  switch (entityType) {
    case 'CUSTOMER':
      return data.vat_number ? `vat:${data.vat_number}` : data.kvk_number ? `kvk:${data.kvk_number}` : data.company_name ? `name:${data.company_name.toLowerCase().trim()}` : null;
    case 'VEHICLE':
      return data.license_plate ? `plate:${data.license_plate.replace(/[\s-]/g, '').toUpperCase()}` : null;
    case 'INVOICE':
      return data.invoice_number ? `inv:${data.invoice_number}` : null;
    default:
      return null;
  }
}

export default function MigrationHub() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectSource, setNewProjectSource] = useState<string>("OTHER");
  
  // CSV import states
  const [csvImporting, setCsvImporting] = useState(false);
  const [entityTypeForImport, setEntityTypeForImport] = useState<string>("CUSTOMER");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Production import
  const [productionImporting, setProductionImporting] = useState(false);
  
  // Dialog states
  const [stagingFilter, setStagingFilter] = useState<string>("all");
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editJson, setEditJson] = useState("");
  const [selectedStagingRecord, setSelectedStagingRecord] = useState<StagingRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const { company } = useCompany();
  const { data: projects = [], isLoading: projectsLoading } = useMigrationProjects();
  const { data: batches = [] } = useMigrationBatches(selectedProject ?? undefined);
  const { data: stagingRecords = [] } = useStagingRecordsByProject(selectedProject ?? undefined);
  const { data: stagingStats } = useStagingStats(selectedProject ?? undefined);
  const { data: issues = [] } = useReconciliationIssues(selectedProject ?? undefined);
  const { data: dualRun } = useDualRunSync(selectedProject ?? undefined);
  const { data: profiles = [] } = useMigrationProfiles(selectedProject ?? undefined);
  const { data: apiConnectors = [], refetch: refetchConnectors } = useMigrationConnectors(selectedProject ?? undefined);
  const { 
    createProject, updateProject, createBatch, updateBatch, 
    insertStagingRecords, updateStagingRecord, deleteStagingRecord,
    resolveIssue, importToProduction, createProfile
  } = useMigrationMutations();

  const currentProject = projects.find(p => p.id === selectedProject);

  // Auto-select first project
  if (!selectedProject && projects.length > 0) {
    setSelectedProject(projects[0].id);
  }

  const handleCreateProject = () => {
    if (!newProjectName.trim() || !company?.id) return;
    createProject.mutate({
      tenant_id: company.id,
      name: newProjectName,
      source_system: newProjectSource as any,
      status: 'DRAFT',
    }, {
      onSuccess: (data) => {
        setSelectedProject(data.id);
      }
    });
    setCreateDialogOpen(false);
    setNewProjectName("");
  };

  // CSV Upload → Parse → Validate → Insert staging records
  const handleCSVUpload = useCallback(async (file: File) => {
    if (!currentProject || !company?.id) {
      toast({ title: "Geen project geselecteerd", variant: "destructive" });
      return;
    }

    setCsvImporting(true);
    toast({ title: "CSV wordt verwerkt", description: `${file.name} wordt geparsed en gevalideerd...` });

    try {
      // 1. Parse CSV
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      
      if (parsed.errors.length > 0) {
        toast({ title: "CSV parse fouten", description: parsed.errors.map(e => e.message).join(', '), variant: "destructive" });
        setCsvImporting(false);
        return;
      }

      const rows = parsed.data as Record<string, any>[];
      if (rows.length === 0) {
        toast({ title: "Leeg bestand", description: "CSV bevat geen data rijen.", variant: "destructive" });
        setCsvImporting(false);
        return;
      }

      // 2. Create batch
      const batchResult = await createBatch.mutateAsync({
        project_id: currentProject.id,
        batch_type: 'FULL',
        status: 'PROCESSING',
        source_artifact_url: file.name,
        created_count: 0,
        updated_count: 0,
        skipped_count: 0,
        error_count: 0,
        started_at: new Date().toISOString(),
      } as any);

      // 3. Validate and create staging records
      let errorCount = 0;
      let readyCount = 0;
      let dupCount = 0;
      const dedupeKeys = new Set<string>();
      const stagingInserts: any[] = [];

      for (const row of rows) {
        const errors = validateRecord(row, entityTypeForImport);
        const dedupeKey = generateDedupeKey(row, entityTypeForImport);
        
        let status: string = 'READY';
        if (errors.length > 0) {
          status = 'ERROR';
          errorCount++;
        } else if (dedupeKey && dedupeKeys.has(dedupeKey)) {
          status = 'DUPLICATE';
          dupCount++;
        } else {
          readyCount++;
        }
        
        if (dedupeKey) dedupeKeys.add(dedupeKey);

        stagingInserts.push({
          batch_id: batchResult.id,
          entity_type: entityTypeForImport,
          source_row_json: row,
          normalized_json: row,
          status,
          error_list_json: errors,
          dedupe_key: dedupeKey,
        });
      }

      // 4. Insert staging records in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < stagingInserts.length; i += chunkSize) {
        const chunk = stagingInserts.slice(i, i + chunkSize);
        await insertStagingRecords.mutateAsync(chunk);
      }

      // 5. Update batch with counts
      await updateBatch.mutateAsync({
        id: batchResult.id,
        status: 'COMPLETED',
        created_count: readyCount,
        error_count: errorCount,
        skipped_count: dupCount,
        finished_at: new Date().toISOString(),
      } as any);

      // 6. Update project status if still DRAFT
      if (currentProject.status === 'DRAFT') {
        await updateProject.mutateAsync({ id: currentProject.id, status: 'RUNNING' } as any);
      }

      toast({ 
        title: "Import naar staging voltooid", 
        description: `${rows.length} rijen: ${readyCount} gereed, ${errorCount} fouten, ${dupCount} duplicaten` 
      });
    } catch (error: any) {
      console.error("CSV import error:", error);
      toast({ title: "Import mislukt", description: error.message, variant: "destructive" });
    } finally {
      setCsvImporting(false);
    }
  }, [currentProject, company, entityTypeForImport, createBatch, insertStagingRecords, updateBatch, updateProject]);

  // Import READY records from staging to production
  const handleImportToProduction = async () => {
    if (!currentProject || !company?.id) return;
    
    const readyRecords = stagingRecords.filter(r => 
      r.status === 'READY' && (selectedRecords.length === 0 || selectedRecords.includes(r.id))
    );
    
    if (readyRecords.length === 0) {
      toast({ title: "Geen records", description: "Geen READY records geselecteerd voor import.", variant: "destructive" });
      return;
    }

    // Group by entity type
    const byType = new Map<string, string[]>();
    for (const r of readyRecords) {
      if (!byType.has(r.entity_type)) byType.set(r.entity_type, []);
      byType.get(r.entity_type)!.push(r.id);
    }

    setProductionImporting(true);
    try {
      for (const [entityType, ids] of byType) {
        await importToProduction.mutateAsync({
          recordIds: ids,
          entityType: entityType as StagingEntityType,
          tenantId: company.id,
        });
      }
      toast({ title: "Productie import voltooid", description: `${readyRecords.length} records succesvol geïmporteerd.` });
      setSelectedRecords([]);
    } catch (error: any) {
      // Error already handled in mutation
    } finally {
      setProductionImporting(false);
    }
  };

  // Edit staging record
  const handleSaveEdit = async () => {
    if (!selectedStagingRecord) return;
    try {
      const parsed = JSON.parse(editJson);
      const errors = validateRecord(parsed, selectedStagingRecord.entity_type);
      await updateStagingRecord.mutateAsync({
        id: selectedStagingRecord.id,
        normalized_json: parsed,
        source_row_json: parsed,
        error_list_json: errors,
        status: errors.length > 0 ? 'ERROR' : 'READY',
      } as any);
      setEditDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Ongeldige JSON", description: e.message, variant: "destructive" });
    }
  };

  // Delete staging record
  const handleDeleteRecord = async () => {
    if (!selectedStagingRecord) return;
    await deleteStagingRecord.mutateAsync(selectedStagingRecord.id);
    setDeleteDialogOpen(false);
    setSelectedStagingRecord(null);
  };

  // Export audit log
  const handleExportAuditLog = () => {
    if (batches.length === 0) {
      toast({ title: "Geen batches", description: "Er zijn geen batches om te exporteren." });
      return;
    }
    const header = "Batch ID,Type,Status,Records,Fouten,Duplicaten,Aangemaakt\n";
    const rows = batches.map(b => 
      `${b.id},${b.batch_type},${b.status},${b.created_count},${b.error_count},${b.skipped_count},${new Date(b.created_at).toLocaleString('nl-NL')}`
    ).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${currentProject?.name || 'export'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export voltooid", description: "Audit log is gedownload." });
  };

  // Filter staging records
  const filteredRecords = stagingRecords.filter(r => {
    if (stagingFilter === "all") return true;
    if (stagingFilter === "error") return r.status === "ERROR";
    if (stagingFilter === "duplicate") return r.status === "DUPLICATE";
    if (stagingFilter === "ready") return r.status === "READY";
    if (stagingFilter === "imported") return r.status === "IMPORTED";
    return true;
  });

  // Toggle record selection
  const toggleRecord = (id: string) => {
    setSelectedRecords(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const toggleAllRecords = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(r => r.id));
    }
  };

  // TMS system groups for Select
  const nlSystems = Object.entries(TMS_SYSTEMS).filter(([, v]) => v.category === 'nl');
  const intlSystems = Object.entries(TMS_SYSTEMS).filter(([, v]) => v.category === 'international');
  const otherSystems = Object.entries(TMS_SYSTEMS).filter(([, v]) => v.category === 'other');

  return (
    <DashboardLayout title="Migratie Hub">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Migratie Hub</h1>
            <p className="text-muted-foreground">
              Importeer data van uw oude TMS — volledig geautomatiseerd
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nieuw Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuw Migratieproject</DialogTitle>
                <DialogDescription>
                  Start een nieuw project om data te importeren van uw oude systeem.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Projectnaam</Label>
                  <Input 
                    placeholder="bijv. EasyTrans Migratie 2024"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bronsysteem</Label>
                  <Select value={newProjectSource} onValueChange={setNewProjectSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Nederland</SelectLabel>
                        {nlSystems.map(([key, sys]) => (
                          <SelectItem key={key} value={key}>
                            {sys.label} — {sys.description}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Internationaal</SelectLabel>
                        {intlSystems.map(([key, sys]) => (
                          <SelectItem key={key} value={key}>
                            {sys.label} ({sys.country}) — {sys.description}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Overig</SelectLabel>
                        {otherSystems.map(([key, sys]) => (
                          <SelectItem key={key} value={key}>
                            {sys.label} — {sys.description}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuleren</Button>
                <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || createProject.isPending}>
                  {createProject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Aanmaken
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Migratieprojecten</CardTitle>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Database className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-lg font-medium">Nog geen migratieprojecten</p>
                  <p className="text-muted-foreground">Maak uw eerste project aan om data te importeren van uw oude TMS.</p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Eerste Project Aanmaken
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Bronsysteem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Laatste Update</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow 
                      key={project.id} 
                      className={`cursor-pointer ${selectedProject === project.id ? 'bg-muted/50' : ''}`}
                      onClick={() => setSelectedProject(project.id)}
                    >
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {TMS_SYSTEMS[project.source_system]?.label || project.source_system}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[project.status]?.variant || "secondary"}>
                          {statusConfig[project.status]?.label || project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(project.updated_at).toLocaleDateString('nl-NL')}
                      </TableCell>
                      <TableCell className="text-right">
                        <ProjectOptionsMenu
                          projectId={project.id}
                          projectName={project.name}
                          onEdit={() => { setSelectedProject(project.id); setActiveTab("overview"); }}
                          onArchive={() => updateProject.mutate({ id: project.id, status: 'ROLLED_BACK' } as any)}
                          onDelete={() => { if (confirm(`Weet je zeker dat je "${project.name}" wilt archiveren?`)) { updateProject.mutate({ id: project.id, status: 'ROLLED_BACK' } as any); } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Project Detail Tabs */}
        {currentProject && (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{currentProject.name}</CardTitle>
                  <CardDescription>
                    {TMS_SYSTEMS[currentProject.source_system]?.label || currentProject.source_system} • {statusConfig[currentProject.status]?.label}
                  </CardDescription>
                </div>
                <Badge variant={statusConfig[currentProject.status]?.variant}>
                  {statusConfig[currentProject.status]?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                  <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <Database className="h-4 w-4 mr-2" />
                    Overzicht
                  </TabsTrigger>
                  <TabsTrigger value="connectors" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </TabsTrigger>
                  <TabsTrigger value="staging" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <FileText className="h-4 w-4 mr-2" />
                    Staging & Fix
                  </TabsTrigger>
                  <TabsTrigger value="reconciliation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Reconciliatie
                  </TabsTrigger>
                  <TabsTrigger value="dualrun" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Dual-Run
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <History className="h-4 w-4 mr-2" />
                    Audit
                  </TabsTrigger>
                  <TabsTrigger value="api-connectors" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                    <Plug className="h-4 w-4 mr-2" />
                    API Connectors
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab — Real KPIs */}
                <TabsContent value="overview" className="p-6 space-y-6">
                  <div className="grid grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{stagingStats?.total?.toLocaleString() || 0}</div>
                        <div className="text-sm text-muted-foreground">Totaal records</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-emerald-500">{stagingStats?.imported?.toLocaleString() || 0}</div>
                        <div className="text-sm text-muted-foreground">Geïmporteerd</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-500">{stagingStats?.errors || 0}</div>
                        <div className="text-sm text-muted-foreground">Fouten</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-amber-500">{stagingStats?.duplicates || 0}</div>
                        <div className="text-sm text-muted-foreground">Duplicaten</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-blue-500">{stagingStats?.ready || 0}</div>
                        <div className="text-sm text-muted-foreground">Gereed voor import</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Entity Progress */}
                  {stagingStats?.byEntity && stagingStats.byEntity.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Importvoortgang per Entiteit</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {stagingStats.byEntity.map((entity) => {
                          const progress = entity.total > 0 ? Math.round((entity.imported / entity.total) * 100) : 0;
                          return (
                            <div key={entity.entity_type} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{ENTITY_TYPE_LABELS[entity.entity_type] || entity.entity_type}</span>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                  <span>{entity.imported}/{entity.total}</span>
                                  {entity.errors > 0 && <span className="text-red-500">{entity.errors} fouten</span>}
                                  {entity.duplicates > 0 && <span className="text-amber-500">{entity.duplicates} dup.</span>}
                                </div>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <FileUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nog geen data geïmporteerd. Ga naar de <strong>Import</strong> tab om te beginnen.</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 flex-wrap">
                    <Button 
                      className="gap-2" 
                      onClick={handleImportToProduction}
                      disabled={productionImporting || !stagingStats?.ready}
                    >
                      {productionImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      {productionImporting ? "Importeren..." : `Alle Gereed Importeren (${stagingStats?.ready || 0})`}
                    </Button>
                  </div>
                </TabsContent>

                {/* Import Tab — CSV Upload */}
                <TabsContent value="connectors" className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Data Importeren</h3>
                  </div>

                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">CSV / Excel Upload</div>
                          <div className="text-sm text-muted-foreground">
                            Upload een CSV of Excel bestand om data te importeren naar staging
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Entiteit Type</Label>
                          <Select value={entityTypeForImport} onValueChange={setEntityTypeForImport}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CUSTOMER">Klanten</SelectItem>
                              <SelectItem value="ADDRESS">Adressen</SelectItem>
                              <SelectItem value="VEHICLE">Voertuigen</SelectItem>
                              <SelectItem value="ORDER">Orders</SelectItem>
                              <SelectItem value="INVOICE">Facturen</SelectItem>
                               <SelectItem value="CARRIER">Charters</SelectItem>
                               <SelectItem value="DRIVER">Eigen Chauffeurs</SelectItem>
                              <SelectItem value="TRANSACTION">Transacties</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>&nbsp;</Label>
                          <Button 
                            className="gap-2 w-full" 
                            disabled={csvImporting}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.csv';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleCSVUpload(file);
                              };
                              input.click();
                            }}
                          >
                            {csvImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                            {csvImporting ? "Verwerken..." : "CSV Uploaden"}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-muted/30 text-sm">
                        <p className="font-medium mb-2">Verwachte kolommen voor {ENTITY_TYPE_LABELS[entityTypeForImport] || entityTypeForImport}:</p>
                        {entityTypeForImport === 'CUSTOMER' && (
                          <p className="text-muted-foreground font-mono text-xs">company_name, contact_name, email, phone, address, postal_code, city, country, vat_number, kvk_number</p>
                        )}
                        {entityTypeForImport === 'ADDRESS' && (
                          <p className="text-muted-foreground font-mono text-xs">label, street, house_number, postal_code, city, country, company_name, contact_name, phone</p>
                        )}
                        {entityTypeForImport === 'VEHICLE' && (
                          <p className="text-muted-foreground font-mono text-xs">license_plate, brand, model, vehicle_type, current_km</p>
                        )}
                        {entityTypeForImport === 'ORDER' && (
                          <p className="text-muted-foreground font-mono text-xs">order_number, trip_date, pickup_address, pickup_city, delivery_address, delivery_city, cargo_description, weight_kg</p>
                        )}
                        {entityTypeForImport === 'INVOICE' && (
                          <p className="text-muted-foreground font-mono text-xs">invoice_number, invoice_date, due_date, total_amount, vat_amount, status</p>
                        )}
                        {entityTypeForImport === 'CARRIER' && (
                          <p className="text-muted-foreground font-mono text-xs">company_name, contact_name, email, phone, vat_number, iban</p>
                        )}
                        {entityTypeForImport === 'DRIVER' && (
                          <p className="text-muted-foreground font-mono text-xs">name, email, phone, license_number, license_expiry, status</p>
                        )}
                        {entityTypeForImport === 'TRANSACTION' && (
                          <p className="text-muted-foreground font-mono text-xs">reference, amount, transaction_date, description, type</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent batches */}
                  {batches.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recente Uploads</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Bestand</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Records</TableHead>
                              <TableHead>Fouten</TableHead>
                              <TableHead>Datum</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batches.slice(0, 10).map(batch => (
                              <TableRow key={batch.id}>
                                <TableCell className="font-mono text-xs">{batch.source_artifact_url || '-'}</TableCell>
                                <TableCell><Badge variant="outline">{batch.batch_type}</Badge></TableCell>
                                <TableCell>
                                  <Badge className={batch.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : batch.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}>
                                    {batch.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{batch.created_count}</TableCell>
                                <TableCell className={batch.error_count > 0 ? 'text-red-500' : ''}>{batch.error_count}</TableCell>
                                <TableCell className="text-muted-foreground">{new Date(batch.created_at).toLocaleString('nl-NL')}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Staging Tab — Real data */}
                <TabsContent value="staging" className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button variant={stagingFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStagingFilter("all")}>
                        Alle ({stagingRecords.length})
                      </Button>
                      <Button variant={stagingFilter === "error" ? "default" : "outline"} size="sm" className={stagingFilter !== "error" ? "text-red-500" : ""} onClick={() => setStagingFilter("error")}>
                        Fouten ({stagingStats?.errors || 0})
                      </Button>
                      <Button variant={stagingFilter === "duplicate" ? "default" : "outline"} size="sm" className={stagingFilter !== "duplicate" ? "text-amber-500" : ""} onClick={() => setStagingFilter("duplicate")}>
                        Duplicaten ({stagingStats?.duplicates || 0})
                      </Button>
                      <Button variant={stagingFilter === "ready" ? "default" : "outline"} size="sm" onClick={() => setStagingFilter("ready")}>
                        Gereed ({stagingStats?.ready || 0})
                      </Button>
                      <Button variant={stagingFilter === "imported" ? "default" : "outline"} size="sm" onClick={() => setStagingFilter("imported")}>
                        Geïmporteerd ({stagingStats?.imported || 0})
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        className="gap-2" 
                        onClick={handleImportToProduction}
                        disabled={productionImporting || selectedRecords.length === 0}
                      >
                        {productionImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Geselecteerde Importeren ({selectedRecords.length})
                      </Button>
                    </div>
                  </div>

                  {filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Geen staging records gevonden. Upload eerst data via de Import tab.</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <input 
                                type="checkbox" 
                                className="rounded"
                                checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                                onChange={toggleAllRecords}
                              />
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Brondata</TableHead>
                            <TableHead>Fouten</TableHead>
                            <TableHead>Dedupe Key</TableHead>
                            <TableHead className="text-right">Acties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>
                                <input 
                                  type="checkbox" 
                                  className="rounded"
                                  checked={selectedRecords.includes(record.id)}
                                  onChange={() => toggleRecord(record.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{ENTITY_TYPE_LABELS[record.entity_type] || record.entity_type}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={stagingStatusConfig[record.status]?.className || ''}>
                                  {stagingStatusConfig[record.status]?.label || record.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs max-w-xs truncate">
                                {JSON.stringify(record.source_row_json).substring(0, 80)}…
                              </TableCell>
                              <TableCell>
                                {Array.isArray(record.error_list_json) && record.error_list_json.length > 0 ? (
                                  <span className="text-red-500 text-sm">{record.error_list_json.join(", ")}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {record.dedupe_key || "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setSelectedStagingRecord(record);
                                  setEditJson(JSON.stringify(record.normalized_json || record.source_row_json, null, 2));
                                  setEditDialogOpen(true);
                                }}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setSelectedStagingRecord(record);
                                  setDeleteDialogOpen(true);
                                }}><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </TabsContent>

                {/* Reconciliation Tab — Real issues */}
                <TabsContent value="reconciliation" className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Open Issues ({issues.filter(i => i.status === 'OPEN').length})</h3>
                      {issues.filter(i => i.status === 'OPEN').length === 0 ? (
                        <Card>
                          <CardContent className="py-8 text-center text-muted-foreground">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                            <p>Geen openstaande issues</p>
                          </CardContent>
                        </Card>
                      ) : (
                        issues.filter(i => i.status === 'OPEN').map((issue) => (
                          <Card key={issue.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  {issue.severity === 'critical' ? (
                                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                                  ) : issue.severity === 'warning' ? (
                                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                                  ) : (
                                    <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                                  )}
                                  <div>
                                    <div className="font-medium">{issue.message}</div>
                                    {issue.suggested_fix_action && (
                                      <div className="text-sm text-muted-foreground mt-1">
                                        Suggestie: {issue.suggested_fix_action}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button size="sm" onClick={() => resolveIssue.mutate({ id: issue.id })}>
                                  Oplossen
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Opgeloste Issues ({issues.filter(i => i.status === 'RESOLVED').length})</h3>
                      {issues.filter(i => i.status === 'RESOLVED').map((issue) => (
                        <Card key={issue.id} className="opacity-60">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                              <div>
                                <div className="font-medium line-through">{issue.message}</div>
                                <div className="text-xs text-muted-foreground">
                                  Opgelost: {issue.resolved_at ? new Date(issue.resolved_at).toLocaleString('nl-NL') : '-'}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Dual-Run Tab */}
                <TabsContent value="dualrun" className="p-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Dual-Run Modus</CardTitle>
                          <CardDescription>
                            Beide systemen parallel draaien voor veilige migratie
                          </CardDescription>
                        </div>
                        <Badge className={dualRun?.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}>
                          {dualRun?.status === 'ACTIVE' ? 'Actief' : 'Niet actief'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {dualRun ? (
                        <>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-muted/50">
                              <div className="text-sm text-muted-foreground">Laatste Delta Sync</div>
                              <div className="text-lg font-semibold">
                                {dualRun.last_delta_at ? new Date(dualRun.last_delta_at).toLocaleString('nl-NL') : 'Nooit'}
                              </div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50">
                              <div className="text-sm text-muted-foreground">Achterstand</div>
                              <div className="text-lg font-semibold">{dualRun.backlog_count} records</div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50">
                              <div className="text-sm text-muted-foreground">Status</div>
                              <div className="text-lg font-semibold">{dualRun.status}</div>
                            </div>
                          </div>
                          {dualRun.last_error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <p className="text-sm text-red-400">⚠️ Laatste fout: {dualRun.last_error}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Dual-run modus is nog niet geconfigureerd voor dit project.</p>
                          <p className="text-sm mt-1">Import eerst data en voer een reconciliatie uit voordat u dual-run activeert.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Audit Tab — Real batches */}
                <TabsContent value="audit" className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Audit Log</h3>
                    <Button variant="outline" className="gap-2" onClick={handleExportAuditLog} disabled={batches.length === 0}>
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                  {batches.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nog geen import batches uitgevoerd.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Bron</TableHead>
                          <TableHead>Records</TableHead>
                          <TableHead>Fouten</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batches.map(batch => (
                          <TableRow key={batch.id}>
                            <TableCell className="font-mono text-xs">{batch.id.substring(0, 8)}…</TableCell>
                            <TableCell><Badge variant="outline">{batch.batch_type}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{batch.source_artifact_url || '-'}</TableCell>
                            <TableCell>{batch.created_count}</TableCell>
                            <TableCell className={batch.error_count > 0 ? 'text-red-500 font-medium' : ''}>{batch.error_count}</TableCell>
                            <TableCell>
                              <Badge className={batch.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : batch.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}>
                                {batch.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{new Date(batch.created_at).toLocaleString('nl-NL')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* API Connectors Tab */}
                <TabsContent value="api-connectors" className="p-6">
                  <ApiConnectorPanel
                    projectId={currentProject.id}
                    connectors={apiConnectors}
                    onConnectorCreated={() => refetchConnectors()}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Edit Staging Record Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Bewerken</DialogTitle>
              <DialogDescription>
                Pas de data aan en sla op. Validatie wordt automatisch opnieuw uitgevoerd.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea 
                className="font-mono text-sm min-h-[300px]"
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleSaveEdit} disabled={updateStagingRecord.isPending}>
                {updateStagingRecord.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Opslaan & Valideren
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Staging Record Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Verwijderen</DialogTitle>
              <DialogDescription>Weet u zeker dat u dit staging record wilt verwijderen?</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">⚠️ Dit kan niet ongedaan worden gemaakt.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</Button>
              <Button variant="destructive" onClick={handleDeleteRecord} disabled={deleteStagingRecord.isPending}>
                {deleteStagingRecord.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verwijderen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
