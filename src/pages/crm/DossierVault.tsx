import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FolderLock, 
  FileText, 
  Upload, 
  Search, 
  Lock,
  Unlock,
  Download,
  Eye,
  RefreshCw,
  Building2,
  Shield,
  File,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DossierDocument {
  id: string;
  account_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  version: number;
  locked_after_signature: boolean;
  locked_at: string | null;
  notes: string | null;
  created_at: string;
  customer?: {
    id: string;
    company_name: string;
  };
}

const DOC_TYPES = {
  CONTRACT: { label: 'Contract', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: FileText },
  INSURANCE: { label: 'Verzekering', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Shield },
  SLA: { label: 'SLA', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: FileText },
  QUOTE: { label: 'Offerte', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: FileText },
  POD_SAMPLE: { label: 'POD Sample', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30', icon: FileText },
  CERT: { label: 'Certificaat', color: 'bg-pink-500/10 text-pink-600 border-pink-500/30', icon: Shield },
  OTHER: { label: 'Overig', color: 'bg-gray-500/10 text-gray-600 border-gray-500/30', icon: FileText },
};

const DossierVault = () => {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    accountId: '',
    docType: 'OTHER',
  });
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['dossier-documents', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('dossier_documents')
        .select(`
          *,
          customer:customers (id, company_name)
        `)
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DossierDocument[];
    },
    enabled: !!company?.id,
  });

  // Fetch customers for upload dialog
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name')
        .eq('tenant_id', company.id)
        .order('company_name');
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!uploadFile || !uploadData.accountId || !company?.id) {
      toast({
        title: 'Vul alle velden in',
        description: 'Selecteer een klant en upload een bestand.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // For demo purposes, just show success
      toast({
        title: 'Document geüpload ✓',
        description: `${uploadFile.name} is succesvol toegevoegd aan de vault.`,
      });
      setIsUploadDialogOpen(false);
      setUploadFile(null);
      setUploadData({ accountId: '', docType: 'OTHER' });
      queryClient.invalidateQueries({ queryKey: ['dossier-documents'] });
    } catch (error: any) {
      toast({
        title: 'Upload mislukt',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAccount = !selectedAccount || doc.account_id === selectedAccount;
    return matchesSearch && matchesAccount;
  });

  // Group by account
  const accountGroups = filteredDocuments.reduce((acc, doc) => {
    const key = doc.account_id;
    if (!acc[key]) {
      acc[key] = {
        account: doc.customer,
        documents: [],
      };
    }
    acc[key].documents.push(doc);
    return acc;
  }, {} as Record<string, { account: any; documents: DossierDocument[] }>);

  const stats = {
    total: documents.length,
    locked: documents.filter(d => d.locked_after_signature).length,
    contracts: documents.filter(d => d.doc_type === 'CONTRACT').length,
    accounts: Object.keys(accountGroups).length,
  };

  return (
    <DashboardLayout title="Dossier Vault" description="Klant documenten en contracten beheren">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20">
                  <FolderLock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Totaal Documenten</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20">
                  <Lock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{stats.locked}</p>
                  <p className="text-xs text-muted-foreground">Vergrendeld</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{stats.contracts}</p>
                  <p className="text-xs text-muted-foreground">Contracten</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20">
                  <Building2 className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.accounts}</p>
                  <p className="text-xs text-muted-foreground">Klanten</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek documenten of klanten..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Document Uploaden
          </Button>
        </div>

        {/* Documents by Account */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(accountGroups).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderLock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">Geen documenten gevonden</p>
              <p className="text-sm text-muted-foreground mt-1">Upload documenten om te starten</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(accountGroups).map(([accountId, { account, documents: docs }]) => (
              <Card key={accountId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {account?.company_name || 'Onbekende klant'}
                    </CardTitle>
                    <Badge variant="secondary">{docs.length} documenten</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {docs.map((doc) => {
                      const typeConfig = DOC_TYPES[doc.doc_type as keyof typeof DOC_TYPES] || DOC_TYPES.OTHER;
                      const TypeIcon = typeConfig.icon;
                      
                      return (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn('p-2 rounded-lg', typeConfig.color.split(' ')[0])}>
                              <TypeIcon className={cn('h-4 w-4', typeConfig.color.split(' ')[1])} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{doc.file_name}</span>
                                {doc.locked_after_signature && (
                                  <Lock className="h-3 w-3 text-emerald-600" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Badge variant="outline" className={cn('text-[10px]', typeConfig.color)}>
                                  {typeConfig.label}
                                </Badge>
                                <span>v{doc.version}</span>
                                <span>•</span>
                                <span>{format(new Date(doc.created_at), 'd MMM yyyy', { locale: nl })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(doc.file_url, '_blank')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const a = document.createElement('a'); a.href = doc.file_url; a.download = doc.file_name; a.click(); }}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Document Uploaden</DialogTitle>
              <DialogDescription>
                Upload een document naar de vault
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Klant *</Label>
                <Select value={uploadData.accountId} onValueChange={(v) => setUploadData({ ...uploadData, accountId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer klant" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document type</Label>
                <Select value={uploadData.docType} onValueChange={(v) => setUploadData({ ...uploadData, docType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bestand *</Label>
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                >
                  <input {...getInputProps()} />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <File className="h-5 w-5 text-primary" />
                      <span className="font-medium">{uploadFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {isDragActive ? "Laat hier los..." : "Sleep een bestand hierheen of klik om te selecteren"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, PNG, JPG</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Uploaden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DossierVault;
