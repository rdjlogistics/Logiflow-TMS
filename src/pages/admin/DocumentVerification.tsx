import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import {
  Shield, RefreshCw, FileCheck, Search, SlidersHorizontal
} from 'lucide-react';
import { Input } from '@/components/ui/input';

import { StatsCards } from '@/components/admin/document-verification/StatsCards';
import { DocumentCard, type DriverDocument, documentTypeLabels } from '@/components/admin/document-verification/DocumentCard';
import { DocumentDetailSheet } from '@/components/admin/document-verification/DocumentDetailSheet';
import { ComplianceTimeline } from '@/components/admin/document-verification/ComplianceTimeline';
import { ExpiryAlerts } from '@/components/admin/document-verification/ExpiryAlerts';
import { BulkActions } from '@/components/admin/document-verification/BulkActions';

export default function DocumentVerification() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<DriverDocument | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAnalyzeProgress, setBulkAnalyzeProgress] = useState<{ current: number; total: number } | undefined>();

  // Fetch all driver documents with profiles
  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['driver-documents-verification', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .order('priority_level', { ascending: false })
        .order('submitted_at', { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((data || []).map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return (data || []).map(doc => ({
        ...doc,
        profiles: { full_name: profileMap.get(doc.user_id) || null }
      })) as DriverDocument[];
    },
    enabled: !!company?.id,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('doc-verification-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_documents' }, () => {
        queryClient.invalidateQueries({ queryKey: ['driver-documents-verification'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('driver_documents')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          admin_review_required: false,
          rejection_reason: null,
        })
        .eq('id', docId);
      if (error) throw error;

      const doc = documents.find(d => d.id === docId);
      if (doc?.user_id) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: doc.user_id,
            title: '✅ Document goedgekeurd',
            body: `Je ${documentTypeLabels[doc.document_type] || doc.document_type} is goedgekeurd.`,
            data: { type: 'document_verified', documentId: docId }
          }
        });
      }
    },
    onSuccess: () => {
      toast.success('Document goedgekeurd');
      queryClient.invalidateQueries({ queryKey: ['driver-documents-verification'] });
      setSelectedDoc(null);
    },
    onError: (error) => toast.error('Fout bij goedkeuren: ' + error.message),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      const { error } = await supabase
        .from('driver_documents')
        .update({
          verification_status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          admin_review_required: false,
          rejection_reason: reason,
        })
        .eq('id', docId);
      if (error) throw error;

      const doc = documents.find(d => d.id === docId);
      if (doc?.user_id) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: doc.user_id,
            title: '❌ Document afgekeurd',
            body: `Je ${documentTypeLabels[doc.document_type] || doc.document_type} is afgekeurd. Reden: ${reason}`,
            data: { type: 'document_rejected', documentId: docId, reason }
          }
        });
      }
    },
    onSuccess: () => {
      toast.success('Document afgekeurd');
      queryClient.invalidateQueries({ queryKey: ['driver-documents-verification'] });
      setSelectedDoc(null);
    },
    onError: (error) => toast.error('Fout bij afkeuren: ' + error.message),
  });

  // AI Re-analyze mutation
  const reanalyzeMutation = useMutation({
    mutationFn: async (doc: DriverDocument) => {
      const { data, error } = await supabase.functions.invoke('analyze-driver-document', {
        body: { documentId: doc.id, imageUrl: doc.file_url, documentType: doc.document_type }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.autoApproved ? 'Document automatisch goedgekeurd door AI' : 'AI-analyse voltooid');
      queryClient.invalidateQueries({ queryKey: ['driver-documents-verification'] });
    },
    onError: (error) => toast.error('AI-analyse mislukt: ' + error.message),
  });

  // Filtered documents
  const pendingDocs = documents.filter(d => d.verification_status === 'pending' && d.admin_review_required);
  const verifiedDocs = documents.filter(d => d.verification_status === 'verified');
  const rejectedDocs = documents.filter(d => d.verification_status === 'rejected');

  const expiringSoon = documents.filter(d => {
    const date = d.expiry_date || d.ai_detected_expiry;
    if (!date) return false;
    const days = differenceInDays(new Date(date), new Date());
    return days <= 90;
  }).length;

  const getDocumentsByTab = useCallback(() => {
    let docs: DriverDocument[];
    switch (activeTab) {
      case 'pending': docs = pendingDocs; break;
      case 'verified': docs = verifiedDocs; break;
      case 'rejected': docs = rejectedDocs; break;
      default: docs = documents;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(d =>
        (d.profiles?.full_name || '').toLowerCase().includes(q) ||
        (documentTypeLabels[d.document_type] || d.document_type).toLowerCase().includes(q) ||
        (d.document_number || '').toLowerCase().includes(q)
      );
    }
    return docs;
  }, [activeTab, documents, pendingDocs, verifiedDocs, rejectedDocs, searchQuery]);

  // Bulk actions
  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const handleBulkAnalyze = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const docs = documents.filter(d => ids.includes(d.id));
    setBulkAnalyzeProgress({ current: 0, total: docs.length });

    for (let i = 0; i < docs.length; i++) {
      try {
        await supabase.functions.invoke('analyze-driver-document', {
          body: { documentId: docs[i].id, imageUrl: docs[i].file_url, documentType: docs[i].document_type }
        });
      } catch { /* continue */ }
      setBulkAnalyzeProgress({ current: i + 1, total: docs.length });
    }

    setBulkAnalyzeProgress(undefined);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['driver-documents-verification'] });
    toast.success(`${docs.length} documenten geanalyseerd`);
  }, [selectedIds, documents, queryClient]);

  const handleBulkApprove = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase
      .from('driver_documents')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: userId,
        admin_review_required: false,
      })
      .in('id', ids);

    if (error) { toast.error('Bulk goedkeuring mislukt'); return; }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['driver-documents-verification'] });
    toast.success(`${ids.length} documenten goedgekeurd`);
  }, [selectedIds, queryClient]);

  const filteredDocs = getDocumentsByTab();

  return (
    <div className="space-y-5 md:space-y-6 pb-20">
      {/* Elite Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-border/20 overflow-hidden p-5 md:p-6"
        style={{ background: 'var(--gradient-mesh)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/15 shadow-[var(--shadow-glow)]"
            >
              <Shield className="h-6 w-6 text-primary" />
            </motion.div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Document Verificatie</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                AI-gestuurde compliance verificatie & fraude detectie
              </p>
            </div>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2 self-start sm:self-center">
            <RefreshCw className="h-4 w-4" />
            Vernieuwen
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <StatsCards
        pending={pendingDocs.length}
        verified={verifiedDocs.length}
        rejected={rejectedDocs.length}
        total={documents.length}
        expiringSoon={expiringSoon}
      />

      {/* Expiry Alerts */}
      <ExpiryAlerts documents={documents} />

      {/* Compliance Timeline */}
      <ComplianceTimeline documents={documents} />

      {/* Document List */}
      <div className="space-y-3">
        {/* Tabs + Search bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
              <TabsTrigger value="pending" className="relative text-xs sm:text-sm gap-1">
                Wachtend
                {pendingDocs.length > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-[16px] rounded-full px-1 text-[10px]">
                    {pendingDocs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="verified" className="text-xs sm:text-sm">Goedgekeurd</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs sm:text-sm">Afgekeurd</TabsTrigger>
              <TabsTrigger value="all" className="text-xs sm:text-sm">Alles</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Document List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          >
            <FileCheck className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Geen documenten gevonden</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filteredDocs.map((doc, i) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  index={i}
                  selected={selectedIds.has(doc.id)}
                  onSelect={handleSelect}
                  onClick={() => setSelectedDoc(doc)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Detail Sheet */}
      <DocumentDetailSheet
        doc={selectedDoc}
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={(id, reason) => rejectMutation.mutate({ docId: id, reason })}
        onReanalyze={(doc) => reanalyzeMutation.mutate(doc)}
        isApproving={approveMutation.isPending}
        isRejecting={rejectMutation.isPending}
        isReanalyzing={reanalyzeMutation.isPending}
      />

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkAnalyze={handleBulkAnalyze}
        onBulkApprove={handleBulkApprove}
        isAnalyzing={!!bulkAnalyzeProgress}
        analyzeProgress={bulkAnalyzeProgress}
      />
    </div>
  );
}
