import { useState, useRef, useCallback } from 'react';
import { Camera, User, X, CheckCircle2, Loader2, Upload, Clock } from 'lucide-react';
import { OnboardingButton } from '../OnboardingButton';
import { useOnboarding } from '../OnboardingContext';
import { OfflineBanner } from '../OfflineBanner';
import { useDriverDocumentUpload } from '@/hooks/useDriverDocumentUpload';
import { useOnboardingOffline } from '@/hooks/useOnboardingOffline';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export const StepProfilePhoto = () => {
  const { data, updateData, setCurrentStep, currentStep, isOnline, pendingUploads: contextPending } = useOnboarding();
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(data.profilePhoto.url);
  const [pendingOffline, setPendingOffline] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadDocument, isUploading, uploadProgress } = useDriverDocumentUpload();
  const { queueUpload } = useOnboardingOffline();

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    updateData({ profilePhoto: { file, url, uploaded: false } });

    if (!navigator.onLine) {
      const offlineUrl = await queueUpload(file, 'profile_photo');
      setPendingOffline(true);
      updateData({ profilePhoto: { file, url: offlineUrl || url, uploaded: false } });
      return;
    }

    const result = await uploadDocument(file, 'profile_photo', { triggerAIAnalysis: true });
    if (result.success) {
      setPendingOffline(false);
      updateData({ profilePhoto: { file, url: result.fileUrl || url, uploaded: true } });
    }
  }, [updateData, uploadDocument, queueUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleRemove = () => {
    setPreviewUrl(null);
    setPendingOffline(false);
    updateData({ profilePhoto: { file: null, url: null, uploaded: false } });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canProceed = !!previewUrl && !isUploading;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12 pb-8 animate-fade-in-up">
      <OfflineBanner isOnline={isOnline} pendingUploads={contextPending} />

      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 animate-fade-in-up">
          <span>Stap {currentStep + 1} van 15</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>Profielfoto</h1>
        <p className="text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Upload een duidelijke foto van jezelf. Dit helpt bij identificatie.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} className="hidden" />

        {previewUrl ? (
          <div className="relative">
            <div className="relative animate-scale-fade-in">
              <img
                src={previewUrl}
                alt="Profielfoto preview"
                className={cn(
                  "w-48 h-48 rounded-full object-cover border-4 shadow-lg",
                  isUploading ? "border-primary/50 shadow-primary/10"
                    : data.profilePhoto.uploaded ? "border-emerald-500 shadow-emerald-500/20"
                    : "border-primary shadow-primary/20"
                )}
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <span className="text-white text-sm font-medium">{uploadProgress}%</span>
                  </div>
                </div>
              )}
              {!isUploading && data.profilePhoto.uploaded && !pendingOffline && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg animate-scale-fade-in">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              )}
              {!isUploading && pendingOffline && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-lg animate-scale-fade-in">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              )}
              {isUploading && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg animate-scale-fade-in">
                  <Upload className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            {!isUploading && (
              <button onClick={handleRemove} className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto animate-fade-in">
                <X className="w-4 h-4" />Verwijderen
              </button>
            )}
            {isUploading && (
              <div className="mt-4 w-48">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground mt-1">Uploaden en analyseren...</p>
              </div>
            )}
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-48 h-48 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
              isDragging ? "border-primary bg-primary/10 scale-105" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-white/5"
            )}
          >
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Camera className="w-4 h-4" /><span>Tik om foto te maken</span>
            </div>
          </div>
        )}

        {!previewUrl && (
          <p className="mt-6 text-sm text-muted-foreground text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Of sleep een foto hierheen
          </p>
        )}
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
