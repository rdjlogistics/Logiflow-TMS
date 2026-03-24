import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Image, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StopDocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  stopId: string;
  stopLabel: string;
}

export const StopDocumentUpload = ({
  isOpen,
  onClose,
  tripId,
  stopId,
  stopLabel,
}: StopDocumentUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Bestand is te groot (max 10MB)');
      return;
    }

    setSelectedFile(file);
    setUploaded(false);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Niet ingelogd');

      const ext = selectedFile.name.split('.').pop() || 'bin';
      const filePath = `${tripId}/${stopId}_${Date.now()}.${ext}`;

      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('order-documents')
        .upload(filePath, selectedFile, { contentType: selectedFile.type });

      if (uploadError) throw uploadError;

      // 2. Insert into order_documents
      const { data: docData, error: docError } = await supabase
        .from('order_documents')
        .insert({
          order_id: tripId,
          name: selectedFile.name,
          document_type: 'STOP_DOCUMENT',
          url: filePath,
          mime_type: selectedFile.type,
          file_size: selectedFile.size,
          is_public: true,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (docError) throw docError;

      // 3. Log access
      await supabase.from('driver_document_access_log').insert({
        trip_id: tripId,
        driver_user_id: user.id,
        action: 'upload',
        document_type: 'STOP_DOCUMENT',
        document_id: docData.id,
        document_name: selectedFile.name,
      });

      // Notify planners (in-app)
      await supabase.from('notifications').insert({
        type: 'driver_document_uploaded',
        title: 'Document geüpload door chauffeur',
        message: `Nieuw document "${selectedFile.name}" bij stop ${stopLabel}`,
        priority: 'normal',
        channel: 'in_app',
        status: 'pending',
        entity_type: 'trip',
        entity_id: tripId,
        action_url: `/orders/${tripId}`,
      });

      // Push notification to planners (fire-and-forget)
      supabase.functions.invoke('send-push-notification-to-planners', {
        body: {
          title: '📎 Document geüpload door chauffeur',
          body: `Nieuw document "${selectedFile.name}" bij stop ${stopLabel}`,
          data: { trip_id: tripId, url: `/orders/${tripId}` },
        },
      }).catch((err) => console.error('Push to planners failed:', err));

      setUploaded(true);
      toast.success('Document geüpload');
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Upload mislukt');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setPreview(null);
    setUploaded(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
        <SheetHeader>
          <SheetTitle className="text-left">Document uploaden — {stopLabel}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* File picker */}
          {!selectedFile && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">Tik om een bestand te kiezen</p>
              <p className="text-sm text-muted-foreground">Foto's of PDF • max 10 MB</p>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Selected file preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              {preview ? (
                <img src={preview} alt="Preview" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
              {!uploading && (
                <button onClick={reset} className="p-1.5 hover:bg-muted rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              )}
              {uploaded && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {selectedFile && !uploaded && (
              <Button onClick={handleUpload} disabled={uploading} className="flex-1">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploaden...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Uploaden
                  </>
                )}
              </Button>
            )}
            {uploaded && (
              <Button variant="outline" onClick={reset} className="flex-1">
                Nog een bestand
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose}>
              Sluiten
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
