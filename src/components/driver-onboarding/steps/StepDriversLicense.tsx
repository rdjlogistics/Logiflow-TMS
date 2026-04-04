import { useState, useRef, useCallback } from 'react';
import { CreditCard, CheckCircle2, X, Camera, Loader2, Shield, Clock } from 'lucide-react';
import { OnboardingButton } from '../OnboardingButton';
import { OnboardingInput } from '../OnboardingInput';
import { useOnboarding } from '../OnboardingContext';
import { useDriverDocumentUpload } from '@/hooks/useDriverDocumentUpload';
import { useOnboardingOffline } from '@/hooks/useOnboardingOffline';
import { OfflineBanner } from '../OfflineBanner';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type Side = 'front' | 'back';

export const StepDriversLicense = () => {
  const { data, updateData, setCurrentStep, currentStep, isOnline, pendingUploads } = useOnboarding();
  const [activeSide, setActiveSide] = useState<Side>('front');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingSide, setUploadingSide] = useState<Side | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadDocument, isUploading, uploadProgress } = useDriverDocumentUpload();
  const { queueUpload, pendingCount, isSyncing, syncProgress } = useOnboardingOffline();

  const handleFileSelect = useCallback(async (file: File, side: Side) => {
    if (!file.type.startsWith('image/')) return;
    const documentType = side === 'front' ? 'drivers_license_front' : 'drivers_license_back';
    
    if (!isOnline) {
      const previewUrl = await queueUpload(file, documentType);
      if (side === 'front') updateData({ driversLicenseFront: { file, url: previewUrl, uploaded: false } });
      else updateData({ driversLicenseBack: { file, url: previewUrl, uploaded: false } });
      return;
    }
    
    const url = URL.createObjectURL(file);
    setUploadingSide(side);
    if (side === 'front') updateData({ driversLicenseFront: { file, url, uploaded: false } });
    else updateData({ driversLicenseBack: { file, url, uploaded: false } });

    const result = await uploadDocument(file, documentType, { triggerAIAnalysis: true });
    if (result.success) {
      if (side === 'front') updateData({ driversLicenseFront: { file, url: result.fileUrl || url, uploaded: true } });
      else updateData({ driversLicenseBack: { file, url: result.fileUrl || url, uploaded: true } });
    }
    setUploadingSide(null);
  }, [updateData, uploadDocument, isOnline, queueUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file, activeSide);
  }, [handleFileSelect, activeSide]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, side: Side) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file, side);
  };

  const handleRemove = (side: Side) => {
    if (side === 'front') {
      updateData({ driversLicenseFront: { file: null, url: null, uploaded: false } });
      if (frontInputRef.current) frontInputRef.current.value = '';
    } else {
      updateData({ driversLicenseBack: { file: null, url: null, uploaded: false } });
      if (backInputRef.current) backInputRef.current.value = '';
    }
  };

  const frontUploaded = !!data.driversLicenseFront.url;
  const backUploaded = !!data.driversLicenseBack.url;
  const frontVerified = data.driversLicenseFront.uploaded;
  const backVerified = data.driversLicenseBack.uploaded;
  const licenseNumberValid = data.driversLicenseNumber.trim().length >= 5;
  const canProceed = frontUploaded && backUploaded && licenseNumberValid && !isUploading;

  const currentUpload = activeSide === 'front' ? data.driversLicenseFront : data.driversLicenseBack;
  const isCurrentSideUploading = uploadingSide === activeSide;
  const isCurrentVerified = activeSide === 'front' ? frontVerified : backVerified;
  const inputRef = activeSide === 'front' ? frontInputRef : backInputRef;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <input ref={frontInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleInputChange(e, 'front')} className="hidden" />
      <input ref={backInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleInputChange(e, 'back')} className="hidden" />

      <OfflineBanner isOnline={isOnline} pendingUploads={pendingCount} isSyncing={isSyncing} syncProgress={syncProgress} />

      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 animate-fade-in-up">
          <span>Stap {currentStep + 1} van 15</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' >Rijbewijs</h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' >
          Upload zowel de voor- als achterkant van je rijbewijs.
        </p>
      </div>
      
      <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 animate-fade-in-up" style={{ animationDelay: '0.25s' >
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-primary">
            <span className="font-medium">AI-verificatie actief:</span> Je rijbewijs wordt automatisch gecontroleerd na uploaden.
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '0.3s' >
        {(['front', 'back'] as Side[]).map((side) => {
          const isActive = activeSide === side;
          const sideUploaded = side === 'front' ? frontUploaded : backUploaded;
          const sideVerified = side === 'front' ? frontVerified : backVerified;
          const isSideUploading = uploadingSide === side;
          
          return (
            <button
              key={side}
              onClick={() => setActiveSide(side)}
              disabled={isUploading}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all",
                isActive ? "bg-primary/20 border-2 border-primary text-primary" : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
              )}
            >
              {isSideUploading ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
                : sideVerified ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                : sideUploaded && !isOnline ? <Clock className="w-4 h-4 text-amber-400" />
                : sideUploaded ? <CheckCircle2 className="w-4 h-4 text-primary/50" />
                : null}
              <span className="font-medium">{side === 'front' ? 'Voorkant' : 'Achterkant'}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 mb-6 animate-fade-in-up" style={{ animationDelay: '0.35s' >
        {currentUpload.url ? (
          <div className="relative">
            <img
              src={currentUpload.url}
              alt={`Rijbewijs ${activeSide === 'front' ? 'voorkant' : 'achterkant'}`}
              className={cn(
                "w-full aspect-[1.6] object-cover rounded-2xl border-2",
                isCurrentSideUploading ? "border-primary/50" : isCurrentVerified ? "border-emerald-500/50" : "border-primary/30"
              )}
            />
            {isCurrentSideUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-2" />
                  <span className="text-white text-sm font-medium">{uploadProgress}%</span>
                </div>
              </div>
            )}
            {!isCurrentSideUploading && (
              <button onClick={() => handleRemove(activeSide)} className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
            {!isCurrentSideUploading && (
              <div className={cn("absolute bottom-3 right-3 p-2 rounded-full animate-scale-fade-in", isCurrentVerified ? "bg-emerald-500" : "bg-primary")}>
                {isCurrentVerified ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Loader2 className="w-5 h-5 text-white animate-spin" />}
              </div>
            )}
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "w-full aspect-[1.6] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all",
              isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-white/5"
            )}
          >
            <div className="w-16 h-16 rounded-xl bg-muted/30 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">{activeSide === 'front' ? 'Voorkant rijbewijs' : 'Achterkant rijbewijs'}</p>
            <div className="flex items-center gap-2 text-sm text-primary">
              <Camera className="w-4 h-4" /><span>Tik om foto te maken</span>
            </div>
          </div>
        )}
        {isCurrentSideUploading && (
          <div className="mt-3">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground mt-1">Uploaden en analyseren...</p>
          </div>
        )}
      </div>

      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' >
        <OnboardingInput value={data.driversLicenseNumber} onChange={(value) => updateData({ driversLicenseNumber: value })} placeholder="Rijbewijsnummer" />
      </div>

      <div className="flex gap-4 mb-6 text-sm animate-fade-in-up" style={{ animationDelay: '0.5s' >
        <div className={cn("flex items-center gap-2", frontVerified ? "text-emerald-400" : frontUploaded ? "text-primary" : "text-muted-foreground")}>
          {uploadingSide === 'front' ? <Loader2 className="w-4 h-4 animate-spin" /> : (frontVerified || frontUploaded) ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
          <span>Voorkant</span>
        </div>
        <div className={cn("flex items-center gap-2", backVerified ? "text-emerald-400" : backUploaded ? "text-primary" : "text-muted-foreground")}>
          {uploadingSide === 'back' ? <Loader2 className="w-4 h-4 animate-spin" /> : (backVerified || backUploaded) ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
          <span>Achterkant</span>
        </div>
        <div className={cn("flex items-center gap-2", licenseNumberValid ? "text-emerald-400" : "text-muted-foreground")}>
          {licenseNumberValid ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
          <span>Nummer</span>
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
