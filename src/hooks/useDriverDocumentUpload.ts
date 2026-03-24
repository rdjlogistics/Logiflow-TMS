import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export type DocumentType = 
  | 'drivers_license_front' 
  | 'drivers_license_back' 
  | 'cpc_card' 
  | 'adr_certificate' 
  | 'identity_document' 
  | 'profile_photo'
  | 'insurance_certificate'
  | 'liability_insurance';

interface UploadResult {
  success: boolean;
  documentId?: string;
  fileUrl?: string;
  error?: string;
}

interface UseDriverDocumentUploadReturn {
  uploadDocument: (
    file: File,
    documentType: DocumentType,
    options?: {
      documentNumber?: string;
      expiryDate?: Date;
      triggerAIAnalysis?: boolean;
    }
  ) => Promise<UploadResult>;
  isUploading: boolean;
  uploadProgress: number;
}

/**
 * Hook for uploading driver documents to Supabase storage
 * and automatically triggering AI analysis
 */
export const useDriverDocumentUpload = (): UseDriverDocumentUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadDocument = useCallback(async (
    file: File,
    documentType: DocumentType,
    options?: {
      documentNumber?: string;
      expiryDate?: Date;
      triggerAIAnalysis?: boolean;
    }
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Je moet ingelogd zijn om documenten te uploaden');
      }

      setUploadProgress(10);

      // Generate unique file name
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const fileName = `${user.id}/${documentType}_${timestamp}.${fileExt}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        logger.error('Upload error:', uploadError);
        throw new Error(`Upload mislukt: ${uploadError.message}`);
      }

      setUploadProgress(50);

      // Get signed URL for the file (valid for 1 year)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('driver-documents')
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365);

      if (signedUrlError) {
        logger.error('Signed URL error:', signedUrlError);
        throw new Error('Kon geen toegangslink genereren');
      }

      setUploadProgress(70);

      // Create document record in database
      const { data: docRecord, error: docError } = await supabase
        .from('driver_documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          file_url: uploadData.path, // Store path, not signed URL
          file_name: file.name,
          document_number: options?.documentNumber || null,
          expiry_date: options?.expiryDate?.toISOString().split('T')[0] || null,
          verification_status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docError) {
        logger.error('Document record error:', docError);
        throw new Error(`Database error: ${docError.message}`);
      }

      setUploadProgress(90);

      // Trigger AI analysis automatically (unless disabled)
      const shouldAnalyze = options?.triggerAIAnalysis !== false;
      
      if (shouldAnalyze && docRecord) {
        // Fire and forget - don't wait for analysis to complete
        supabase.functions.invoke('analyze-driver-document', {
          body: {
            documentId: docRecord.id,
            imageUrl: uploadData.path,
            documentType: documentType,
          },
        }).then(({ data, error }) => {
          if (error) {
            logger.error('AI analysis error:', error);
          } else {
            logger.log('AI analysis triggered:', data);
            // Show toast when analysis completes
            if (data?.analysis?.isValid) {
              toast.success('Document geverifieerd', {
                description: `${getDocumentTypeName(documentType)} is automatisch gecontroleerd.`,
              });
            } else if (data?.analysis) {
              toast.info('Document ter review', {
                description: 'Een medewerker zal je document handmatig controleren.',
              });
            }
          }
        }).catch(err => {
          console.error('AI analysis invoke error:', err);
        });
      }

      setUploadProgress(100);

      return {
        success: true,
        documentId: docRecord?.id,
        fileUrl: signedUrlData?.signedUrl,
      };

    } catch (error) {
      console.error('Document upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload mislukt';
      toast.error('Upload mislukt', { description: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsUploading(false);
      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 500);
    }
  }, []);

  return {
    uploadDocument,
    isUploading,
    uploadProgress,
  };
};

// Helper function to get Dutch document type names
function getDocumentTypeName(type: DocumentType): string {
  const names: Record<DocumentType, string> = {
    drivers_license_front: 'Rijbewijs voorkant',
    drivers_license_back: 'Rijbewijs achterkant',
    cpc_card: 'Chauffeurskaart (CPC)',
    adr_certificate: 'ADR-certificaat',
    identity_document: 'Identiteitsbewijs',
    profile_photo: 'Profielfoto',
    insurance_certificate: 'Verzekeringsbewijs',
    liability_insurance: 'Aansprakelijkheidsverzekering',
  };
  return names[type] || type;
}
