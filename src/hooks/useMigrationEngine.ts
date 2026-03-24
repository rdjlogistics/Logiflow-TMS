import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
export type SourceSystem =
  | 'EASYTRANS' | 'CUSTOM' | 'OTHER'
  | 'TRANSPOREON' | 'WICS' | 'BOLTRICS' | 'CARGON' | 'KOOPMAN'
  | 'PRINCETON_TMX' | 'GOCOMET' | 'ORACLE_TMS' | 'SAP_TM'
  | 'BLUEROCK' | 'CARGOWISE' | 'DESCARTES' | 'TRIMBLE'
  | 'MERCURIUS' | 'YELLOWSTAR';

export interface MigrationProject {
  id: string;
  tenant_id: string;
  name: string;
  source_system: SourceSystem;
  status: 'DRAFT' | 'RUNNING' | 'DUAL_RUN' | 'CUTOVER_READY' | 'CUTOVER_DONE' | 'ROLLED_BACK';
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface MigrationConnector {
  id: string;
  project_id: string;
  type: 'CSV_UPLOAD' | 'API_PULL' | 'EMAIL_INGEST';
  config_json: any;
  status: 'ACTIVE' | 'PAUSED';
  last_run_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface MigrationProfile {
  id: string;
  project_id: string;
  name: string;
  mapping_json: any;
  normalization_rules_json: any;
  dedupe_rules_json: any;
  validation_rules_json: any;
  inference_rules_json: any;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  created_at: string;
  created_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  updated_at: string;
}

export interface MigrationBatch {
  id: string;
  project_id: string;
  connector_id: string | null;
  profile_id: string | null;
  batch_type: 'FULL' | 'DELTA';
  source_artifact_url: string | null;
  source_hash: string | null;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  started_at: string | null;
  finished_at: string | null;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  correlation_id: string | null;
  created_at: string;
}

export type StagingEntityType = 'CUSTOMER' | 'ADDRESS' | 'CARRIER' | 'DRIVER' | 'VEHICLE' | 'PRODUCT' | 'ORDER' | 'INVOICE' | 'DOC' | 'TRANSACTION';
export type StagingStatus = 'READY' | 'ERROR' | 'DUPLICATE' | 'IGNORED' | 'IMPORTED';

export interface StagingRecord {
  id: string;
  batch_id: string;
  entity_type: StagingEntityType;
  source_row_json: any;
  normalized_json: any;
  status: StagingStatus;
  error_list_json: any;
  dedupe_key: string | null;
  linked_target_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationReport {
  id: string;
  project_id: string;
  batch_id: string | null;
  status: 'RED' | 'AMBER' | 'GREEN';
  metrics_json: any;
  issues_count: number;
  generated_at: string;
  report_file_url: string | null;
}

export interface ReconciliationIssue {
  id: string;
  project_id: string;
  batch_id: string | null;
  type: string;
  severity: string;
  entity_type: string | null;
  staging_record_id: string | null;
  entity_id: string | null;
  message: string;
  suggested_fix_action: string | null;
  status: 'OPEN' | 'RESOLVED';
  owner_user_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface DualRunSync {
  id: string;
  project_id: string;
  schedule_json: any;
  last_delta_at: string | null;
  status: 'ACTIVE' | 'PAUSED';
  backlog_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RollbackPlan {
  id: string;
  project_id: string;
  batch_id: string;
  can_rollback: boolean;
  rollback_scope_json: any;
  executed_at: string | null;
  executed_by: string | null;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  created_at: string;
}

// TMS Systems catalog
export const TMS_SYSTEMS: Record<SourceSystem, { label: string; country: string; description: string; category: 'nl' | 'international' | 'other' }> = {
  EASYTRANS: { label: 'EasyTrans', country: 'NL', description: 'Transport & logistiek', category: 'nl' },
  BOLTRICS: { label: 'Boltrics', country: 'NL', description: 'Dynamics 365 TMS', category: 'nl' },
  WICS: { label: 'Wics', country: 'NL', description: 'WMS/TMS voor logistiek', category: 'nl' },
  CARGON: { label: 'Cargon', country: 'NL', description: 'Cloud TMS', category: 'nl' },
  KOOPMAN: { label: 'Koopman', country: 'NL', description: 'Transport management', category: 'nl' },
  MERCURIUS: { label: 'Mercurius', country: 'NL', description: 'Transport software', category: 'nl' },
  YELLOWSTAR: { label: 'YellowStar', country: 'NL', description: 'TMS voor expediteurs', category: 'nl' },
  BLUEROCK: { label: 'BlueRock', country: 'NL', description: 'Logistics software', category: 'nl' },
  TRANSPOREON: { label: 'Transporeon', country: 'DE', description: 'Europees logistics platform', category: 'international' },
  GOCOMET: { label: 'GoComet', country: 'IN', description: 'Freight management', category: 'international' },
  PRINCETON_TMX: { label: 'Princeton TMX', country: 'US', description: 'Enterprise TMS', category: 'international' },
  ORACLE_TMS: { label: 'Oracle TMS', country: 'US', description: 'Enterprise logistics', category: 'international' },
  SAP_TM: { label: 'SAP TM', country: 'DE', description: 'SAP Transport Management', category: 'international' },
  CARGOWISE: { label: 'CargoWise', country: 'AU', description: 'Global logistics', category: 'international' },
  DESCARTES: { label: 'Descartes', country: 'CA', description: 'Supply chain management', category: 'international' },
  TRIMBLE: { label: 'Trimble', country: 'US', description: 'Transportation technology', category: 'international' },
  CUSTOM: { label: 'Aangepast CSV', country: '-', description: 'Eigen CSV/Excel bestand', category: 'other' },
  OTHER: { label: 'Anders', country: '-', description: 'Ander bronsysteem', category: 'other' },
};

// ─── Queries ─────────────────────────────────────────────────────────

export function useMigrationProjects() {
  return useQuery({
    queryKey: ['migration-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('migration_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MigrationProject[];
    },
  });
}

export function useMigrationProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['migration-project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('migration_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data as MigrationProject;
    },
    enabled: !!projectId,
  });
}

export function useMigrationConnectors(projectId: string | undefined) {
  return useQuery({
    queryKey: ['migration-connectors', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('migration_connectors')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MigrationConnector[];
    },
    enabled: !!projectId,
  });
}

export function useMigrationProfiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ['migration-profiles', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('migration_profiles')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false });
      if (error) throw error;
      return data as MigrationProfile[];
    },
    enabled: !!projectId,
  });
}

export function useMigrationBatches(projectId: string | undefined) {
  return useQuery({
    queryKey: ['migration-batches', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('migration_batches')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MigrationBatch[];
    },
    enabled: !!projectId,
  });
}

export function useStagingRecords(batchId: string | undefined) {
  return useQuery({
    queryKey: ['staging-records', batchId],
    queryFn: async () => {
      if (!batchId) return [];
      const { data, error } = await supabase
        .from('staging_records')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as StagingRecord[];
    },
    enabled: !!batchId,
  });
}

export function useStagingRecordsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['staging-records-project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      // Get all batch IDs for the project, then get staging records
      const { data: batches, error: bErr } = await supabase
        .from('migration_batches')
        .select('id')
        .eq('project_id', projectId);
      if (bErr) throw bErr;
      if (!batches?.length) return [];

      const batchIds = batches.map(b => b.id);
      const { data, error } = await supabase
        .from('staging_records')
        .select('*')
        .in('batch_id', batchIds)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as StagingRecord[];
    },
    enabled: !!projectId,
  });
}

export function useStagingStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ['staging-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data: batches, error: bErr } = await supabase
        .from('migration_batches')
        .select('id')
        .eq('project_id', projectId);
      if (bErr) throw bErr;
      if (!batches?.length) return { total: 0, ready: 0, errors: 0, duplicates: 0, imported: 0, ignored: 0, byEntity: [] as { entity_type: string; total: number; ready: number; errors: number; duplicates: number; imported: number }[] };

      const batchIds = batches.map(b => b.id);
      const { data, error } = await supabase
        .from('staging_records')
        .select('status, entity_type')
        .in('batch_id', batchIds);
      if (error) throw error;

      const records = data || [];
      const stats = {
        total: records.length,
        ready: records.filter(r => r.status === 'READY').length,
        errors: records.filter(r => r.status === 'ERROR').length,
        duplicates: records.filter(r => r.status === 'DUPLICATE').length,
        imported: records.filter(r => r.status === 'IMPORTED').length,
        ignored: records.filter(r => r.status === 'IGNORED').length,
        byEntity: [] as { entity_type: string; total: number; ready: number; errors: number; duplicates: number; imported: number }[],
      };

      // Group by entity_type
      const entityMap = new Map<string, { total: number; ready: number; errors: number; duplicates: number; imported: number }>();
      for (const r of records) {
        const et = r.entity_type;
        if (!entityMap.has(et)) entityMap.set(et, { total: 0, ready: 0, errors: 0, duplicates: 0, imported: 0 });
        const e = entityMap.get(et)!;
        e.total++;
        if (r.status === 'READY') e.ready++;
        if (r.status === 'ERROR') e.errors++;
        if (r.status === 'DUPLICATE') e.duplicates++;
        if (r.status === 'IMPORTED') e.imported++;
      }
      stats.byEntity = Array.from(entityMap.entries()).map(([entity_type, v]) => ({ entity_type, ...v }));

      return stats;
    },
    enabled: !!projectId,
  });
}

export function useReconciliationIssues(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reconciliation-issues', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('reconciliation_issues')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReconciliationIssue[];
    },
    enabled: !!projectId,
  });
}

export function useDualRunSync(projectId: string | undefined) {
  return useQuery({
    queryKey: ['dual-run-sync', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('dual_run_syncs')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data as DualRunSync | null;
    },
    enabled: !!projectId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────

export function useMigrationMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProject = useMutation({
    mutationFn: async (data: Partial<MigrationProject>) => {
      const { data: result, error } = await supabase
        .from('migration_projects')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-projects'] });
      toast({ title: "Project aangemaakt" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MigrationProject> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('migration_projects')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['migration-projects'] });
      queryClient.invalidateQueries({ queryKey: ['migration-project', variables.id] });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const createConnector = useMutation({
    mutationFn: async (data: Partial<MigrationConnector>) => {
      const { data: result, error } = await supabase
        .from('migration_connectors')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['migration-connectors', variables.project_id] });
      toast({ title: "Connector toegevoegd" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const createProfile = useMutation({
    mutationFn: async (data: Partial<MigrationProfile>) => {
      const { data: result, error } = await supabase
        .from('migration_profiles')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['migration-profiles', variables.project_id] });
      toast({ title: "Profiel aangemaakt" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MigrationProfile> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('migration_profiles')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-profiles'] });
      toast({ title: "Profiel bijgewerkt" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const createBatch = useMutation({
    mutationFn: async (data: Partial<MigrationBatch>) => {
      const { data: result, error } = await supabase
        .from('migration_batches')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['migration-batches', variables.project_id] });
      toast({ title: "Batch gestart" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const updateBatch = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MigrationBatch> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('migration_batches')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-batches'] });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const updateStagingRecord = useMutation({
    mutationFn: async ({ id, ...data }: Partial<StagingRecord> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('staging_records')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staging-records'] });
      queryClient.invalidateQueries({ queryKey: ['staging-records-project'] });
      queryClient.invalidateQueries({ queryKey: ['staging-stats'] });
      toast({ title: "Record bijgewerkt" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const deleteStagingRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staging_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staging-records'] });
      queryClient.invalidateQueries({ queryKey: ['staging-records-project'] });
      queryClient.invalidateQueries({ queryKey: ['staging-stats'] });
      toast({ title: "Record verwijderd" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const insertStagingRecords = useMutation({
    mutationFn: async (records: Partial<StagingRecord>[]) => {
      const { data, error } = await supabase
        .from('staging_records')
        .insert(records as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staging-records'] });
      queryClient.invalidateQueries({ queryKey: ['staging-records-project'] });
      queryClient.invalidateQueries({ queryKey: ['staging-stats'] });
    },
    onError: (error: any) => {
      toast({ title: "Fout bij staging insert", description: error.message, variant: "destructive" });
    },
  });

  const resolveIssue = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ReconciliationIssue> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('reconciliation_issues')
        .update({ ...data, status: 'RESOLVED', resolved_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-issues'] });
      toast({ title: "Issue opgelost" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const updateDualRunSync = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DualRunSync> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('dual_run_syncs')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dual-run-sync'] });
      toast({ title: "Dual-run instellingen bijgewerkt" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const createDualRunSync = useMutation({
    mutationFn: async (data: Partial<DualRunSync>) => {
      const { data: result, error } = await supabase
        .from('dual_run_syncs')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dual-run-sync', variables.project_id] });
      toast({ title: "Dual-run modus ingeschakeld" });
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  // Import staging records to production tables
  const importToProduction = useMutation({
    mutationFn: async ({ recordIds, entityType, tenantId }: { recordIds: string[]; entityType: StagingEntityType; tenantId: string }) => {
      // 1. Fetch the staging records
      const { data: records, error: fetchErr } = await supabase
        .from('staging_records')
        .select('*')
        .in('id', recordIds)
        .eq('status', 'READY' as any);
      if (fetchErr) throw fetchErr;
      if (!records?.length) throw new Error('Geen records met status READY gevonden');

      const tableMap: Record<string, string> = {
        CUSTOMER: 'customers',
        ADDRESS: 'address_book',
        VEHICLE: 'vehicles',
        ORDER: 'trips',
        INVOICE: 'invoices',
        TRANSACTION: 'finance_transactions',
        CARRIER: 'carriers',
        DRIVER: 'drivers',
      };

      const tableName = tableMap[entityType];
      if (!tableName) throw new Error(`Import voor ${entityType} wordt nog niet ondersteund`);

      // 2. Map normalized_json to insert data
      const insertData = records.map(r => {
        const norm: Record<string, any> = typeof r.normalized_json === 'object' && r.normalized_json !== null 
          ? { ...(r.normalized_json as Record<string, any>) } 
          : typeof r.source_row_json === 'object' && r.source_row_json !== null 
            ? { ...(r.source_row_json as Record<string, any>) } 
            : {};
        const tenantField = ['customers', 'vehicles', 'invoices', 'finance_transactions', 'trips'].includes(tableName) ? 'company_id' : 'tenant_id';
        norm[tenantField] = tenantId;
        return norm;
      });

      // 3. Insert into production table
      const { data: inserted, error: insertErr } = await supabase
        .from(tableName as any)
        .insert(insertData)
        .select();
      if (insertErr) throw insertErr;

      // 4. Mark staging records as IMPORTED
      for (let i = 0; i < records.length; i++) {
        await supabase
          .from('staging_records')
          .update({ status: 'IMPORTED' as any } as any)
          .eq('id', records[i].id);
      }

      return { count: (inserted as any[])?.length || records.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staging-records'] });
      queryClient.invalidateQueries({ queryKey: ['staging-records-project'] });
      queryClient.invalidateQueries({ queryKey: ['staging-stats'] });
      toast({ title: "Import succesvol", description: `${result.count} records geïmporteerd naar productie.` });
    },
    onError: (error: any) => {
      toast({ title: "Import mislukt", description: error.message, variant: "destructive" });
    },
  });

  return {
    createProject,
    updateProject,
    createConnector,
    createProfile,
    updateProfile,
    createBatch,
    updateBatch,
    updateStagingRecord,
    deleteStagingRecord,
    insertStagingRecords,
    resolveIssue,
    updateDualRunSync,
    createDualRunSync,
    importToProduction,
  };
}
