import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import {
  FileText,
  Download,
  RefreshCw,
  ExternalLink,
  ScrollText,
  ClipboardCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  orderNumber?: string | null;
}

interface Document {
  id: string;
  document_type: string;
  name: string;
  url: string;
  created_at: string;
}

// Maps local display types to edge function documentType values
const EDGE_FUNCTION_TYPE_MAP: Record<string, string> = {
  'CMR': 'cmr_full',
  'VRACHTBRIEF': 'vrachtbrief',
  'OPDRACHTBEVESTIGING': 'transportopdracht',
};

const documentTypes = [
  { 
    type: 'CMR', 
    label: 'CMR Vrachtbrief', 
    description: 'Internationaal transport',
    icon: ScrollText,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  },
  { 
    type: 'VRACHTBRIEF', 
    label: 'AVC Vrachtbrief', 
    description: 'Nationaal transport',
    icon: FileText,
    color: 'bg-green-500/10 text-green-600 border-green-500/20'
  },
  { 
    type: 'OPDRACHTBEVESTIGING', 
    label: 'Opdrachtbevestiging', 
    description: 'Ritdetails',
    icon: ClipboardCheck,
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
  },
];

export const DocumentsSheet = ({
  open,
  onOpenChange,
  tripId,
  orderNumber,
}: DocumentsSheetProps) => {
  const { toast } = useToast();
  const { data: tenantSettings } = useTenantSettings();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const showDocumentsInApp = tenantSettings?.show_documents_in_driver_app ?? false;

  // Fetch existing documents
  const fetchDocuments = async () => {
    if (!tripId) return;
    
    setLoading(true);
    try {
      const query = supabase
        .from('order_documents')
        .select('*')
        .eq('order_id', tripId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && tripId) {
      fetchDocuments();
    }
  }, [open, tripId]);

  const logDocumentAccess = async (
    action: 'view' | 'generate',
    documentType: string,
    documentId?: string,
    documentName?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('driver_document_access_log').insert({
        driver_user_id: user.id,
        trip_id: tripId,
        document_id: documentId || null,
        document_type: documentType,
        document_name: documentName || null,
        action,
      });
    } catch (err) {
      console.error('Failed to log document access:', err);
    }
  };

  const downloadViaBlob = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      }, 100);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const generateDocument = async (documentType: string) => {
    setGenerating(documentType);
    try {
      const edgeFunctionType = EDGE_FUNCTION_TYPE_MAP[documentType] || documentType.toLowerCase();
      const { data, error } = await supabase.functions.invoke('generate-document-pdf', {
        body: { orderId: tripId, documentType: edgeFunctionType },
      });

      if (error) throw error;

      if (data.url) {
        await downloadViaBlob(data.url, `${documentType}-${tripId}.pdf`);
      } else if (data.html) {
        // Fallback: open HTML in new tab
        const blob = new Blob([data.html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }

      toast({
        title: 'Document gegenereerd',
        description: `${documentType} is aangemaakt`,
      });
      logDocumentAccess('generate', documentType);
      fetchDocuments();
    } catch (error: unknown) {
      console.error('Error generating document:', error);
      toast({
        title: 'Fout',
        description: 'Kon document niet genereren',
        variant: 'destructive',
      });
    } finally {
      setGenerating(null);
    }
  };

  const openDocument = async (doc: Document) => {
    try {
      if (doc.url.startsWith('http')) {
        await downloadViaBlob(doc.url, doc.name);
        logDocumentAccess('view', doc.document_type, doc.id, doc.name);
        return;
      }
      
      const { data, error } = await supabase.storage
        .from('order-documents')
        .createSignedUrl(doc.url, 60 * 60);
      
      if (error) throw error;
      
      if (data?.signedUrl) {
        await downloadViaBlob(data.signedUrl, doc.name);
        logDocumentAccess('view', doc.document_type, doc.id, doc.name);
      } else {
        throw new Error('Geen URL ontvangen');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: 'Fout',
        description: 'Kon document niet openen',
        variant: 'destructive',
      });
    }
  };

  const getDocumentForType = (type: string) => {
    return documents.find(d => d.document_type === type);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documenten
            {orderNumber && (
              <Badge variant="outline" className="ml-2">
                {orderNumber}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto pb-6">
          {!showDocumentsInApp ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Documentweergave is uitgeschakeld</p>
              <p className="text-xs mt-1">Neem contact op met uw beheerder</p>
            </div>
          ) : (
            <>
              {/* Document types */}
              {documentTypes.map((docType) => {
                const existingDoc = getDocumentForType(docType.type);
                const isGenerating = generating === docType.type;
                const Icon = docType.icon;

                return (
                  <Card key={docType.type} className={cn('border', docType.color)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center',
                            docType.color.replace('text-', 'bg-').replace('/10', '/20')
                          )}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{docType.label}</h3>
                            <p className="text-sm text-muted-foreground">
                              {docType.description}
                            </p>
                            {existingDoc && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Laatst gegenereerd: {new Date(existingDoc.created_at).toLocaleDateString('nl-NL')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {existingDoc && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10"
                              onClick={() => openDocument(existingDoc)}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open
                            </Button>
                          )}
                          <Button
                            variant={existingDoc ? "outline" : "default"}
                            size="sm"
                            className="h-10"
                            onClick={() => generateDocument(docType.type)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : existingDoc ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Vernieuwen
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-1" />
                                Genereer
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Separator className="my-4" />

              {/* Other documents */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <h3 className="font-medium text-sm text-muted-foreground">Overige documenten</h3>
                  {documents.filter(d => !['CMR', 'VRACHTBRIEF', 'OPDRACHTBEVESTIGING'].includes(d.document_type)).length > 0 ? (
                    <div className="space-y-2">
                      {documents
                        .filter(d => !['CMR', 'VRACHTBRIEF', 'OPDRACHTBEVESTIGING'].includes(d.document_type))
                        .map((doc) => (
                          <Card key={doc.id} className="border">
                            <CardContent className="p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{doc.name}</p>
                                  <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => openDocument(doc)}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Geen overige documenten</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
