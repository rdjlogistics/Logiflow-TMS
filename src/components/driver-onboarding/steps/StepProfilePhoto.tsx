import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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
    updateData({
      profilePhoto: { file, url, uploaded: false }
    });

    if (!navigator.onLine) {
      // Queue for later upload
      const offlineUrl = await queueUpload(file, 'profile_photo');
      setPendingOffline(true);
      updateData({
        profilePhoto: { file, url: offlineUrl || url, uploaded: false }
      });
      return;
    }

    // Upload to Supabase and trigger AI analysis
    const result = await uploadDocument(file, 'profile_photo', {
      triggerAIAnalysis: true,
    });

    if (result.success) {
      setPendingOffline(false);
      updateData({
        profilePhoto: { file, url: result.fileUrl || url, uploaded: true }
      });
    }
  }, [updateData, uploadDocument, queueUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setPendingOffline(false);
    updateData({
      profilePhoto: { file: null, url: null, uploaded: false }
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Allow proceeding with offline queued photo
  const canProceed = !!previewUrl && !isUploading;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col min-h-screen px-6 pt-12 pb-8"
    >
      <OfflineBanner isOnline={isOnline} pendingUploads={contextPending} />

      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-2"
        >
          <span>Stap {currentStep + 1} van 15</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold text-foreground mb-2"
        >
          Profielfoto
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          Upload een duidelijke foto van jezelf. Dit helpt bij identificatie.
        </motion.p>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex-1 flex flex-col items-center justify-center mb-8"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleInputChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <img
                src={previewUrl}
                alt="Profielfoto preview"
                className={cn(
                  "w-48 h-48 rounded-full object-cover border-4 shadow-lg",
                  isUploading 
                    ? "border-primary/50 shadow-primary/10" 
                    : data.profilePhoto.uploaded 
                      ? "border-emerald-500 shadow-emerald-500/20"
                      : "border-primary shadow-primary/20"
                )}
              />
              
              {/* Upload Progress Overlay */}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <span className="text-white text-sm font-medium">{uploadProgress}%</span>
                  </div>
                </div>
              )}
              
              {/* Success badge */}
              {!isUploading && data.profilePhoto.uploaded && !pendingOffline && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
                >
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </motion.div>
              )}
              
              {/* Pending offline badge */}
              {!isUploading && pendingOffline && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"
                >
                  <Clock className="w-5 h-5 text-white" />
                </motion.div>
              )}
              
              {/* Uploading badge */}
              {isUploading && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg"
                >
                  <Upload className="w-5 h-5 text-white" />
                </motion.div>
              )}
            </motion.div>
            
            {!isUploading && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleRemove}
                className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <X className="w-4 h-4" />
                Verwijderen
              </motion.button>
            )}
            
            {/* Upload progress bar */}
            {isUploading && (
              <div className="mt-4 w-48">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground mt-1">
                  Uploaden en analyseren...
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-48 h-48 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
              isDragging
                ? "border-primary bg-primary/10 scale-105"
                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-white/5"
            )}
          >
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Camera className="w-4 h-4" />
              <span>Tik om foto te maken</span>
            </div>
          </div>
        )}

        {!previewUrl && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-sm text-muted-foreground text-center"
          >
            Of sleep een foto hierheen
          </motion.p>
        )}
      </motion.div>

      {/* Buttons */}
      <div className="space-y-3">
        <OnboardingButton
          onClick={() => setCurrentStep(currentStep + 1)}
          disabled={!canProceed}
          loading={isUploading}
        >
          {isUploading ? 'Uploaden...' : 'Doorgaan'}
        </OnboardingButton>
        <OnboardingButton
          onClick={() => setCurrentStep(currentStep - 1)}
          variant="ghost"
          disabled={isUploading}
        >
          Terug
        </OnboardingButton>
      </div>
    </motion.div>
  );
};
