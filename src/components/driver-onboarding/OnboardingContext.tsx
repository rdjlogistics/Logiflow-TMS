import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface DocumentUpload {
  file: File | null;
  url: string | null;
  uploaded: boolean;
}

export type DriverCategory = 'light' | 'heavy';
export type EmploymentType = 'employed' | 'zzp';

export interface OnboardingData {
  name: string;
  phone: string;
  dateOfBirth: Date | null;
  email: string;
  password: string;
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  driverCategory: DriverCategory | null;
  employmentType: EmploymentType | null;
  profilePhoto: DocumentUpload;
  driversLicenseFront: DocumentUpload;
  driversLicenseBack: DocumentUpload;
  driversLicenseExpiry: Date | null;
  driversLicenseNumber: string;
  cpcCard: DocumentUpload;
  cpcCardExpiry: Date | null;
  adrCertificate: DocumentUpload;
  adrCertificateExpiry: Date | null;
  identityDocument: DocumentUpload;
  insuranceCertificate: DocumentUpload;
  liabilityInsurance: DocumentUpload;
  vehicleTypes: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
  isOnline: boolean;
  pendingUploads: number;
  setPendingUploads: (count: number) => void;
  clearDraft: () => void;
  hasDraft: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const DRAFT_KEY = 'driver_onboarding_draft';
const STEP_KEY = 'driver_onboarding_step';

const emptyUpload: DocumentUpload = { file: null, url: null, uploaded: false };

const initialData: OnboardingData = {
  name: '',
  phone: '',
  dateOfBirth: null,
  email: '',
  password: '',
  notificationsEnabled: false,
  locationEnabled: false,
  driverCategory: null,
  employmentType: null,
  profilePhoto: { ...emptyUpload },
  driversLicenseFront: { ...emptyUpload },
  driversLicenseBack: { ...emptyUpload },
  driversLicenseExpiry: null,
  driversLicenseNumber: '',
  cpcCard: { ...emptyUpload },
  cpcCardExpiry: null,
  adrCertificate: { ...emptyUpload },
  adrCertificateExpiry: null,
  identityDocument: { ...emptyUpload },
  insuranceCertificate: { ...emptyUpload },
  liabilityInsurance: { ...emptyUpload },
  vehicleTypes: [],
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
};

// Serialize data for localStorage (strip File objects, convert Dates)
function serializeDraft(data: OnboardingData): string {
  const serializable: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      serializable[key] = { __date: value.toISOString() };
    } else if (value && typeof value === 'object' && 'file' in value) {
      // DocumentUpload — keep url and uploaded status but strip File
      const doc = value as DocumentUpload;
      serializable[key] = { file: null, url: doc.url, uploaded: doc.uploaded };
    } else {
      serializable[key] = value;
    }
  }
  return JSON.stringify(serializable);
}

function deserializeDraft(json: string): Partial<OnboardingData> {
  try {
    const parsed = JSON.parse(json);
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value === 'object' && '__date' in (value as any)) {
        result[key] = new Date((value as any).__date);
      } else {
        result[key] = value;
      }
    }
    return result as Partial<OnboardingData>;
  } catch {
    return {};
  }
}

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [hasDraft, setHasDraft] = useState(() => {
    try { return !!localStorage.getItem(DRAFT_KEY); } catch { return false; }
  });

  // Restore draft from localStorage on init
  const [data, setData] = useState<OnboardingData>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const restored = deserializeDraft(saved);
        // Don't restore password for security
        delete restored.password;
        return { ...initialData, ...restored };
      }
    } catch { /* ignore */ }
    return initialData;
  });

  const [currentStep, setCurrentStepRaw] = useState(() => {
    try {
      const saved = localStorage.getItem(STEP_KEY);
      if (saved) {
        const step = parseInt(saved, 10);
        if (!isNaN(step) && step >= 0 && step < 15) return step;
      }
    } catch { /* ignore */ }
    return 0;
  });

  const totalSteps = 15;

  // Check for existing draft on mount
  // hasDraft is now initialized synchronously in useState

  // Online/offline listeners
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Persist data to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, serializeDraft(data));
    } catch { /* storage full or unavailable */ }
  }, [data]);

  // Persist step
  const setCurrentStep = useCallback((step: number) => {
    setCurrentStepRaw(step);
    try {
      localStorage.setItem(STEP_KEY, String(step));
    } catch { /* ignore */ }
  }, []);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(STEP_KEY);
    } catch { /* ignore */ }
    setHasDraft(false);
  }, []);

  return (
    <OnboardingContext.Provider value={{
      data, updateData, currentStep, setCurrentStep, totalSteps,
      isOnline, pendingUploads, setPendingUploads, clearDraft, hasDraft,
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};
