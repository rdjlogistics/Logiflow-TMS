import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Trash2, FolderOpen, FileText, Download, Loader2 } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type DocType = Database['public']['Enums']['compliance_doc_type'];

interface ComplianceDoc {
  id: string;
  doc_name: string;
  doc_type: DocType;
  doc_number: string | null;
  expiry_date: string | null;
  issue_date: string | null;
  file_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  carrierId: string;
  tenantId: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  drivers_license: 'Rijbewijs',
  adr_certificate: 'ADR certificaat',
  health_certificate: 'Gezondheidsverklaring',
  contract: 'Contract',
  vehicle_inspection: 'Voertuigkeuring',
  vehicle_insurance: 'Voertuigverzekering',
  vehicle_lease: 'Voertuiglease',
  tailgate_certificate: 'Laadklep certificaat',
  other: 'Overig',
};

function getExpiryBadge(expiryDate: string | null) {
  if (!expiryDate) return null;
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return <Badge variant="destructive">Verlopen</Badge>;
  if (days <= 14) return <Badge className="bg-orange-500/15 text-orange-600 border-orange-200">Verloopt binnenkort</Badge>;
  if (days <= 30) return <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-200">Verloopt &lt;30d</Badge>;
  return <Badge variant="secondary" className="text-green-700">Geldig</Badge>;
}

export function CarrierDocumentsManager({ carrierId, tenantId }: Props) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    doc_name: '',
    doc_type: 'other' as DocType,
    doc_number: '',
    expiry_date: '',
    issue_date: '',
    notes: '',
  });

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('compliance_documents')
      .select('*')
      .eq('entity_type', 'carrier' as any)
      .eq('entity_id', carrierId)
      .order('created_at', { ascending: false });
    if (!error) setDocs((data as unknown as ComplianceDoc[]) || []);
    setLoading(false);
  }, [carrierId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const onDrop = useCallback((files: File[]) => {
    if (files.length > 0) {
      setUploadFile(files[0]);
      setForm(f => ({ ...f, doc_name: f.doc_name || files[0].name.replace(/\.[^/.]+$/, '') }));
      setDialogOpen(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
  });

  const handleSave = async () => {
    if (!form.doc_name.trim()) {
      toast({ title: 'Documentnaam is verplicht', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let fileUrl: string | null = null;
    if (uploadFile) {
      const ext = uploadFile.name.split('.').pop();
      const path = `carrier-docs/${carrierId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('order-documents').upload(path, uploadFile);
      if (uploadError) {
        toast({ title: 'Upload mislukt', description: uploadError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      fileUrl = path;
    }

    const { error } = await supabase.from('compliance_documents').insert({
      company_id: tenantId,
      entity_type: 'carrier' as any,
      entity_id: carrierId,
      doc_name: form.doc_name.trim(),
      doc_type: form.doc_type,
      doc_number: form.doc_number.trim() || null,
      expiry_date: form.expiry_date || null,
      issue_date: form.issue_date || null,
      file_url: fileUrl,
      notes: form.notes.trim() || null,
    });

    if (error) {
      toast({ title: 'Fout bij opslaan', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Document toegevoegd' });
      setDialogOpen(false);
      setUploadFile(null);
      setForm({ doc_name: '', doc_type: 'other', doc_number: '', expiry_date: '', issue_date: '', notes: '' });
      fetchDocs();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const doc = docs.find(d => d.id === deleteId);
    if (doc?.file_url) {
      await supabase.storage.from('order-documents').remove([doc.file_url]);
    }
    const { error } = await supabase.from('compliance_documents').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Fout bij verwijderen', variant: 'destructive' });
    } else {
      toast({ title: 'Document verwijderd' });
      fetchDocs();
    }
    setDeleting(false);
    setDeleteOpen(false);
    setDeleteId(null);
  };

  const handleDownload = async (doc: ComplianceDoc) => {
    if (!doc.file_url) return;
    const { data, error } = await supabase.storage.from('order-documents').createSignedUrl(doc.file_url, 60);
    if (error || !data?.signedUrl) {
      toast({ title: 'Download mislukt', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" /> Documenten ({docs.length})
        </CardTitle>
        <Button size="sm" onClick={() => { setUploadFile(null); setForm({ doc_name: '', doc_type: 'other', doc_number: '', expiry_date: '', issue_date: '', notes: '' }); setDialogOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Toevoegen
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Laat het bestand los om te uploaden' : 'Sleep een document hierheen of klik om te selecteren'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG (max 20MB)</p>
        </div>

        {/* Documents list */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Laden...</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nog geen documenten geüpload.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Nummer</TableHead>
                <TableHead>Vervaldatum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    {doc.doc_name}
                  </TableCell>
                  <TableCell>{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</TableCell>
                  <TableCell>{doc.doc_number || '—'}</TableCell>
                  <TableCell>
                    {doc.expiry_date ? format(parseISO(doc.expiry_date), 'd MMM yyyy', { locale: nl }) : '—'}
                  </TableCell>
                  <TableCell>{getExpiryBadge(doc.expiry_date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {doc.file_url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(doc.id); setDeleteOpen(true); >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Document Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {uploadFile && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{uploadFile.name}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Documentnaam *</Label>
              <Input value={form.doc_name} onChange={e => setForm(f => ({ ...f, doc_name: e.target.value }))} placeholder="Bijv. ADR certificaat" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.doc_type} onValueChange={v => setForm(f => ({ ...f, doc_type: v as DocType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Documentnummer</Label>
                <Input value={form.doc_number} onChange={e => setForm(f => ({ ...f, doc_number: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Afgiftedatum</Label>
                <Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Vervaldatum</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notities</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optionele notities" />
            </div>
            {!uploadFile && (
              <div
                {...getRootProps()}
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input {...getInputProps()} />
                <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Optioneel: sleep een bestand hierheen</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Document verwijderen"
        description="Weet je zeker dat je dit document wilt verwijderen? Het bestand wordt ook verwijderd."
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </Card>
  );
}
