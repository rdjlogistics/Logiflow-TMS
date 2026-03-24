import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      // Queue for later upload
      const previewUrl = await queueUpload(file, documentType);
      if (side === 'front') {
        updateData({ driversLicenseFront: { file, url: previewUrl, uploaded: false } });
      } else {
        updateData({ driversLicenseBack: { file, url: previewUrl, uploaded: false } });
      }
      return;
    }
    
    const url = URL.createObjectURL(file);
    setUploadingSide(side);
    
    if (side === 'front') {
      updateData({ driversLicenseFront: { file, url, uploaded: false } });
    } else {
      updateData({ driversLicenseBack: { file, url, uploaded: false } });
    }

    const result = await uploadDocument(file, documentType, {
      triggerAIAnalysis: true,
    });

    if (result.success) {
      if (side === 'front') {
        updateData({ driversLicenseFront: { file, url: result.fileUrl || url, uploaded: true } });
      } else {
        updateData({ driversLicenseBack: { file, url: result.fileUrl || url, uploaded: true } });
      }
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
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col min-h-screen px-6 pt-12 pb-8"
    >
      {/* Hidden inputs */}
      <input
        ref={frontInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleInputChange(e, 'front')}
        className="hidden"
      />
      <input
        ref={backInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleInputChange(e, 'back')}
        className="hidden"
      />

      {/* Offline banner */}
      <OfflineBanner isOnline={isOnline} pendingUploads={pendingCount} isSyncing={isSyncing} syncProgress={syncProgress} />

      {/* Header */}
      <div className="mb-6">
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
          Rijbewijs
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground"
        >
          Upload zowel de voor- als achterkant van je rijbewijs.
        </motion.p>
      </div>
      
      {/* AI verification badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20"
      >
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-primary">
            <span className="font-medium">AI-verificatie actief:</span> Je rijbewijs wordt automatisch 
            gecontroleerd na uploaden.
          </p>
        </div>
      </motion.div>

      {/* Side tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3 mb-6"
      >
        {(['front', 'back'] as Side[]).map((side) => {
          const isActive = activeSide === side;
          const isUploaded = side === 'front' ? frontUploaded : backUploaded;
          const isVerified = side === 'front' ? frontVerified : backVerified;
          const isSideUploading = uploadingSide === side;
          
          return (
            <button
              key={side}
              onClick={() => setActiveSide(side)}
              disabled={isUploading}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all",
                isActive
                  ? "bg-primary/20 border-2 border-primary text-primary"
                  : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
              )}
            >
              {isSideUploading ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : isVerified ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : isUploaded && !isOnline ? (
                <Clock className="w-4 h-4 text-amber-400" />
              ) : isUploaded ? (
                <CheckCircle2 className="w-4 h-4 text-primary/50" />
              ) : null}
              <span className="font-medium">{side === 'front' ? 'Voorkant' : 'Achterkant'}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Upload area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSide}
          initial={{ opacity: 0, x: activeSide === 'front' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeSide === 'front' ? 20 : -20 }}
          className="flex-1 mb-6"
        >
          {currentUpload.url ? (
            <div className="relative">
              <img
                src={currentUpload.url}
                alt={`Rijbewijs ${activeSide === 'front' ? 'voorkant' : 'achterkant'}`}
                className={cn(
                  "w-full aspect-[1.6] object-cover rounded-2xl border-2",
                  isCurrentSideUploading 
                    ? "border-primary/50" 
                    : isCurrentVerified 
                      ? "border-emerald-500/50" 
                      : "border-primary/30"
                )}
              />
              
              {/* Upload progress overlay */}
              {isCurrentSideUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-2" />
                    <span className="text-white text-sm font-medium">{uploadProgress}%</span>
                  </div>
                </div>
              )}
              
              {!isCurrentSideUploading && (
                <button
                  onClick={() => handleRemove(activeSide)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              
              {!isCurrentSideUploading && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "absolute bottom-3 right-3 p-2 rounded-full",
                    isCurrentVerified ? "bg-emerald-500" : "bg-primary"
                  )}
                >
                  {isCurrentVerified ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  )}
                </motion.div>
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
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/30 hover:border-primary/50 hover:bg-white/5"
              )}
            >
              <div className="w-16 h-16 rounded-xl bg-muted/30 flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">
                {activeSide === 'front' ? 'Voorkant rijbewijs' : 'Achterkant rijbewijs'}
              </p>
              <div className="flex items-center gap-2 text-sm text-primary">
                <Camera className="w-4 h-4" />
                <span>Tik om foto te maken</span>
              </div>
            </div>
          )}
          
          {/* Upload progress bar below image */}
          {isCurrentSideUploading && (
            <div className="mt-3">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground mt-1">
                Uploaden en analyseren...
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* License number */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <OnboardingInput
          value={data.driversLicenseNumber}
          onChange={(value) => updateData({ driversLicenseNumber: value })}
          placeholder="Rijbewijsnummer"
        />
      </motion.div>

      {/* Status indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-4 mb-6 text-sm"
      >
        <div className={cn(
          "flex items-center gap-2",
          frontVerified ? "text-emerald-400" : frontUploaded ? "text-primary" : "text-muted-foreground"
        )}>
          {uploadingSide === 'front' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : frontVerified ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : frontUploaded ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-current" />
          )}
          <span>Voorkant</span>
        </div>
        <div className={cn(
          "flex items-center gap-2",
          backVerified ? "text-emerald-400" : backUploaded ? "text-primary" : "text-muted-foreground"
        )}>
          {uploadingSide === 'back' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : backVerified ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : backUploaded ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-current" />
          )}
          <span>Achterkant</span>
        </div>
        <div className={cn(
          "flex items-center gap-2",
          licenseNumberValid ? "text-emerald-400" : "text-muted-foreground"
        )}>
          {licenseNumberValid ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
          <span>Nummer</span>
        </div>
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
