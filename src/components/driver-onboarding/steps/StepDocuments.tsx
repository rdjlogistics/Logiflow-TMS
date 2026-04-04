import { useState, useRef, useCallback, useMemo } from 'react';
import { FileText, CheckCircle2, X, Camera, AlertTriangle, ChevronDown, ChevronUp, Info, Loader2, Shield, Clock } from 'lucide-react';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding, DocumentUpload } from '../OnboardingContext';
import { useDriverDocumentUpload, DocumentType } from '@/hooks/useDriverDocumentUpload';
import { useOnboardingOffline } from '@/hooks/useOnboardingOffline';
import { OfflineBanner } from '../OfflineBanner';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type DocType = 'cpc' | 'adr' | 'identity' | 'insurance' | 'liability';

interface DocumentConfig {
  key: DocType;
  title: string;
  description: string;
  required: boolean;
  dataKey: keyof typeof dataKeyMap;
  supabaseType: DocumentType;
  zzpOnly?: boolean;
}

const dataKeyMap = {
  cpcCard: 'cpcCard',
  adrCertificate: 'adrCertificate',
  identityDocument: 'identityDocument',
  insuranceCertificate: 'insuranceCertificate',
  liabilityInsurance: 'liabilityInsurance',
} as const;

export const StepDocuments = () => {
  const { data, updateData, setCurrentStep, currentStep, isOnline, pendingUploads } = useOnboarding();
  const { uploadDocument, isUploading, uploadProgress } = useDriverDocumentUpload();
  const { queueUpload, pendingCount, isSyncing, syncProgress } = useOnboardingOffline();
  
  const requiresCPC = data.driverCategory === 'heavy';
  const isZZP = data.employmentType === 'zzp';
  
  const DOCUMENTS: DocumentConfig[] = useMemo(() => {
    const docs: DocumentConfig[] = [
      { key: 'cpc', title: 'Chauffeurskaart (CPC)', description: requiresCPC ? 'Vakbekwaamheidsbewijs voor beroepschauffeurs (verplicht)' : 'Vakbekwaamheidsbewijs (optioneel voor jouw categorie)', required: requiresCPC, dataKey: 'cpcCard', supabaseType: 'cpc_card' },
      { key: 'adr', title: 'ADR-certificaat', description: 'Voor vervoer van gevaarlijke stoffen (optioneel)', required: false, dataKey: 'adrCertificate', supabaseType: 'adr_certificate' },
      { key: 'identity', title: 'Identiteitsbewijs', description: 'Paspoort of ID-kaart', required: true, dataKey: 'identityDocument', supabaseType: 'identity_document' },
    ];
    if (isZZP) {
      docs.push(
        { key: 'insurance', title: 'Verzekeringsbewijs (WAM)', description: 'Wettelijke aansprakelijkheidsverzekering voor je voertuig', required: true, dataKey: 'insuranceCertificate', supabaseType: 'insurance_certificate', zzpOnly: true },
        { key: 'liability', title: 'Aansprakelijkheidsverzekering (AVB)', description: 'Bedrijfsaansprakelijkheidsverzekering', required: true, dataKey: 'liabilityInsurance', supabaseType: 'liability_insurance', zzpOnly: true },
      );
    }
    return docs;
  }, [requiresCPC, isZZP]);
  
  const [expandedDoc, setExpandedDoc] = useState<DocType | null>(requiresCPC ? 'cpc' : 'identity');
  const [uploadingDoc, setUploadingDoc] = useState<DocType | null>(null);
  
  const cpcInputRef = useRef<HTMLInputElement>(null);
  const adrInputRef = useRef<HTMLInputElement>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  const liabilityInputRef = useRef<HTMLInputElement>(null);

  const inputRefs: Record<DocType, React.RefObject<HTMLInputElement>> = {
    cpc: cpcInputRef, adr: adrInputRef, identity: identityInputRef, insurance: insuranceInputRef, liability: liabilityInputRef,
  };

  const handleFileSelect = useCallback(async (file: File, docType: DocType) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;
    const doc = DOCUMENTS.find(d => d.key === docType);
    if (!doc) return;
    
    if (!isOnline) {
      const previewUrl = await queueUpload(file, doc.supabaseType);
      updateData({ [doc.dataKey]: { file, url: previewUrl, uploaded: false } } as any);
      return;
    }
    
    const url = URL.createObjectURL(file);
    setUploadingDoc(docType);
    updateData({ [doc.dataKey]: { file, url, uploaded: false } } as any);

    const result = await uploadDocument(file, doc.supabaseType, { triggerAIAnalysis: true });
    if (result.success) {
      updateData({ [doc.dataKey]: { file, url: result.fileUrl || url, uploaded: true } } as any);
    }
    setUploadingDoc(null);
  }, [updateData, DOCUMENTS, uploadDocument, isOnline, queueUpload]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, docType: DocType) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file, docType);
  };

  const handleRemove = (docType: DocType) => {
    const doc = DOCUMENTS.find(d => d.key === docType);
    if (doc) {
      updateData({ [doc.dataKey]: { file: null, url: null, uploaded: false } } as any);
      const ref = inputRefs[docType];
      if (ref.current) ref.current.value = '';
    }
  };

  const getUploadStatus = (docType: DocType): DocumentUpload => {
    const doc = DOCUMENTS.find(d => d.key === docType);
    if (!doc) return { file: null, url: null, uploaded: false };
    return (data as any)[doc.dataKey];
  };

  const cpcUploaded = !!data.cpcCard.url;
  const identityUploaded = !!data.identityDocument.url;
  const insuranceUploaded = !!data.insuranceCertificate?.url;
  const liabilityUploaded = !!data.liabilityInsurance?.url;
  
  let canProceed = identityUploaded && !isUploading;
  if (requiresCPC) canProceed = canProceed && cpcUploaded;
  if (isZZP) canProceed = canProceed && insuranceUploaded && liabilityUploaded;

  const getRequiredDocsMessage = () => {
    const missing: string[] = [];
    if (!identityUploaded) missing.push('ID');
    if (requiresCPC && !cpcUploaded) missing.push('CPC');
    if (isZZP && !insuranceUploaded) missing.push('WAM');
    if (isZZP && !liabilityUploaded) missing.push('AVB');
    if (missing.length === 0) return null;
    return `Upload ${missing.join(', ')} om door te gaan`;
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      {DOCUMENTS.map(doc => (
        <input key={doc.key} ref={inputRefs[doc.key]} type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => handleInputChange(e, doc.key)} className="hidden" />
      ))}

      <OfflineBanner isOnline={isOnline} pendingUploads={pendingCount} isSyncing={isSyncing} syncProgress={syncProgress} />

      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 animate-fade-in-up">
          <span>Stap {currentStep + 1} van 15</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' >
          Documenten
        </h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' >
          Upload je overige documenten voor verificatie.
        </p>
      </div>

      {!requiresCPC && !isZZP && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in-up" style={{ animationDelay: '0.25s' >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-400">
              Als bestelbus/personenbuschauffeur (B/BE) is de chauffeurskaart niet verplicht. Je kunt deze stap overslaan of optioneel uploaden.
            </p>
          </div>
        </div>
      )}
      
      {isZZP && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-fade-in-up" style={{ animationDelay: '0.25s' >
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400">
              <span className="font-medium">ZZP-documenten vereist:</span> Je verzekeringsbewijs (WAM) en aansprakelijkheidsverzekering (AVB) zijn verplicht als zelfstandige.
            </p>
          </div>
        </div>
      )}
      
      <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 animate-fade-in-up" style={{ animationDelay: '0.28s' >
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-primary">
            <span className="font-medium">AI-verificatie actief:</span> Je documenten worden automatisch gecontroleerd na uploaden voor snellere goedkeuring.
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 mb-6 overflow-y-auto animate-fade-in-up" style={{ animationDelay: '0.3s' >
        {DOCUMENTS.map((doc, index) => {
          const upload = getUploadStatus(doc.key);
          const isExpanded = expandedDoc === doc.key;
          const isUploaded = !!upload.url;
          const isCurrentlyUploading = uploadingDoc === doc.key;
          const isVerified = upload.uploaded;

          return (
            <div
              key={doc.key}
              className={cn(
                "rounded-2xl border transition-all overflow-hidden animate-fade-in-up",
                isVerified ? "border-emerald-500/30 bg-emerald-500/5"
                  : isUploaded ? "border-primary/30 bg-primary/5"
                  : doc.zzpOnly ? "border-amber-500/20 bg-amber-500/5"
                  : "border-white/10 bg-white/5"
              )}
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <button onClick={() => setExpandedDoc(isExpanded ? null : doc.key)} className="w-full p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                    isVerified ? "bg-emerald-500/20" : isUploaded ? "bg-primary/20" : doc.zzpOnly ? "bg-amber-500/20" : "bg-white/10"
                  )}>
                    {isCurrentlyUploading ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      : isVerified ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      : doc.zzpOnly ? <Shield className="w-5 h-5 text-amber-400" />
                      : <FileText className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{doc.title}</span>
                      {doc.zzpOnly && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">ZZP</span>}
                      {doc.required && !isUploaded && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Verplicht</span>}
                      {!doc.required && !isUploaded && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Optioneel</span>}
                      {isVerified && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">✓ Geüpload</span>}
                      {!isVerified && isUploaded && !isOnline && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Wacht op upload
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="overflow-hidden animate-fade-in">
                  <div className="px-4 pb-4">
                    {isUploaded ? (
                      <div className="relative">
                        {upload.url?.endsWith('.pdf') ? (
                          <div className={cn("w-full h-32 rounded-xl flex items-center justify-center", isVerified ? "bg-emerald-500/10" : "bg-white/10")}>
                            <FileText className="w-12 h-12 text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">PDF geüpload</span>
                          </div>
                        ) : (
                          <img src={upload.url!} alt={doc.title} className={cn("w-full h-32 object-cover rounded-xl border-2", isVerified ? "border-emerald-500/50" : "border-primary/50")} />
                        )}
                        {isCurrentlyUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                              <span className="text-white text-sm">{uploadProgress}%</span>
                            </div>
                          </div>
                        )}
                        {!isCurrentlyUploading && (
                          <button onClick={() => handleRemove(doc.key)} className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => inputRefs[doc.key].current?.click()}
                        className={cn(
                          "w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all",
                          doc.zzpOnly ? "border-amber-500/30 hover:border-amber-500/50" : "border-muted-foreground/30 hover:border-primary/50"
                        )}
                      >
                        <Camera className={cn("w-6 h-6", doc.zzpOnly ? "text-amber-400" : "text-muted-foreground")} />
                        <span className={cn("text-sm", doc.zzpOnly ? "text-amber-400" : "text-muted-foreground")}>Tik om te uploaden</span>
                      </button>
                    )}
                    {isCurrentlyUploading && (
                      <div className="mt-3">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-center text-muted-foreground mt-1">Uploaden en AI-verificatie...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 animate-fade-in-up" style={{ animationDelay: '0.6s' >
        <div className="flex items-center gap-3">
          {canProceed ? (
            <><CheckCircle2 className="w-5 h-5 text-emerald-400" /><span className="text-sm text-emerald-400">Alle verplichte documenten geüpload</span></>
          ) : isUploading ? (
            <><Loader2 className="w-5 h-5 text-primary animate-spin" /><span className="text-sm text-primary">Document wordt geüpload...</span></>
          ) : (
            <><AlertTriangle className="w-5 h-5 text-amber-400" /><span className="text-sm text-amber-400">{getRequiredDocsMessage()}</span></>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <OnboardingButton onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed} loading={isUploading}>
          {isUploading ? 'Uploaden...' : 'Doorgaan'}
        </OnboardingButton>
        <OnboardingButton onClick={() => setCurrentStep(currentStep - 1)} variant="ghost" disabled={isUploading}>
          Terug
        </OnboardingButton>
      </div>
    </div>
  );
};
