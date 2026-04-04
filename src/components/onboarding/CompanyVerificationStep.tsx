import { useState, useEffect, useCallback } from 'react';
import { Building2, Check, X, AlertCircle, Loader2, CreditCard, FileText, MapPin, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { validateKvK, validateBTWNummer, validateIBAN, validateNLPostcode, validateNLTelefoon, formatIBAN, formatPostcode } from '@/lib/nl-validators';

interface CompanyForm {
  name: string;
  kvk_number: string;
  vat_number: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  iban: string;
}

interface CompanyVerificationStepProps {
  companyForm: CompanyForm;
  onUpdate: (field: string, value: string) => void;
}

type ValidationStatus = 'idle' | 'valid' | 'invalid';

interface FieldValidation {
  status: ValidationStatus;
  message?: string;
}

const ValidationIcon = ({ status }: { status: ValidationStatus }) => (
  <>
    {status === 'valid' && (
      <div
        key="valid"
        className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center"
      >
        <Check className="h-3 w-3 text-emerald-500" />
      </div>
    )}
    {status === 'invalid' && (
      <div
        key="invalid"
        className="h-5 w-5 rounded-full bg-destructive/15 flex items-center justify-center"
      >
        <X className="h-3 w-3 text-destructive" />
      </div>
    )}
  </>
);

export const CompanyVerificationStep = ({ companyForm, onUpdate }: CompanyVerificationStepProps) => {
  const [validations, setValidations] = useState<Record<string, FieldValidation>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const validate = useCallback((field: string, value: string): FieldValidation => {
    if (!value.trim()) return { status: 'idle' };

    switch (field) {
      case 'name':
        return value.trim().length >= 2
          ? { status: 'valid' }
          : { status: 'invalid', message: 'Minimaal 2 tekens' };
      case 'kvk_number': {
        const err = validateKvK(value);
        return err ? { status: 'invalid', message: err } : { status: 'valid' };
      }
      case 'vat_number': {
        const err = validateBTWNummer(value);
        return err ? { status: 'invalid', message: err } : { status: 'valid' };
      }
      case 'iban': {
        const err = validateIBAN(value);
        return err ? { status: 'invalid', message: err } : { status: 'valid' };
      }
      case 'postal_code': {
        const err = validateNLPostcode(value);
        return err ? { status: 'invalid', message: err } : { status: 'valid' };
      }
      case 'phone': {
        const err = validateNLTelefoon(value);
        return err ? { status: 'invalid', message: err } : { status: 'valid' };
      }
      case 'address':
      case 'city':
        return value.trim().length >= 1
          ? { status: 'valid' }
          : { status: 'invalid', message: 'Verplicht veld' };
      default:
        return { status: 'idle' };
    }
  }, []);

  // Validate on change for touched fields
  useEffect(() => {
    const newValidations: Record<string, FieldValidation> = {};
    Object.entries(companyForm).forEach(([key, value]) => {
      if (touchedFields.has(key)) {
        newValidations[key] = validate(key, value);
      }
    });
    setValidations(newValidations);
  }, [companyForm, touchedFields, validate]);

  const handleBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const handleChange = (field: string, value: string) => {
    // Auto-format certain fields
    if (field === 'iban' && value.length > 4) {
      onUpdate(field, formatIBAN(value));
      return;
    }
    if (field === 'postal_code' && value.replace(/\s/g, '').length >= 6) {
      onUpdate(field, formatPostcode(value));
      return;
    }
    if (field === 'vat_number') {
      onUpdate(field, value.toUpperCase());
      return;
    }
    onUpdate(field, value);
  };

  const validCount = Object.values(validations).filter(v => v.status === 'valid').length;
  const totalFields = 8;
  const progressPercent = (validCount / totalFields) * 100;

  const fields = [
    { key: 'name', label: 'Bedrijfsnaam', placeholder: 'Transport BV', icon: Building2, span: 2, hint: 'Zoals geregistreerd bij KvK' },
    { key: 'kvk_number', label: 'KvK-nummer', placeholder: '12345678', icon: FileText, hint: '8 cijfers' },
    { key: 'vat_number', label: 'BTW-nummer', placeholder: 'NL123456789B01', icon: FileText, hint: 'NL + 9 cijfers + B + 2 cijfers' },
    { key: 'address', label: 'Adres', placeholder: 'Hoofdweg 1', icon: MapPin, span: 2 },
    { key: 'postal_code', label: 'Postcode', placeholder: '1234 AB', icon: MapPin, hint: '1234 AB' },
    { key: 'city', label: 'Plaats', placeholder: 'Amsterdam', icon: MapPin },
    { key: 'phone', label: 'Telefoon', placeholder: '+31 6 12345678', icon: Phone, hint: 'NL formaat' },
    { key: 'iban', label: 'IBAN', placeholder: 'NL91 ABNA 0417 1643 00', icon: CreditCard, hint: 'Voor facturen' },
  ];

  return (
    <div className="max-w-lg mx-auto py-6 sm:py-10 space-y-6">
      {/* Header with progress ring */}
      <div className="text-center space-y-3">
        <div className="relative inline-flex items-center justify-center">
          {/* Progress ring SVG */}
          <svg className="absolute -inset-2 w-[76px] h-[76px]" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r="34" fill="none" stroke="hsl(var(--muted) / 0.2)" strokeWidth="2.5" />
            <circle
              cx="38" cy="38" r="34" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          </svg>
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20"
          >
            <Building2 className="h-7 w-7 text-white" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-light tracking-tight">
          Jouw <span className="font-semibold">bedrijf</span>
        </h2>
        <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
          Vul je gegevens in — ze verschijnen op facturen en documenten
        </p>
        {validCount > 0 && (
          <p
            className="text-xs text-primary/70 font-medium"
          >
            {validCount} van {totalFields} velden geverifieerd
          </p>
        )}
      </div>

      {/* Fields */}
      <div
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {fields.map(({ key, label, placeholder, icon: Icon, span, hint }) => {
          const val = validations[key];
          const isValid = val?.status === 'valid';
          const isInvalid = val?.status === 'invalid';

          return (
            <div
              key={key}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
              }}
              className={cn(span === 2 && 'sm:col-span-2')}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                  <Icon className="h-3 w-3" />
                  {label}
                </Label>
                <ValidationIcon status={val?.status || 'idle'} />
              </div>
              <Input
                value={(companyForm as any)[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                onBlur={() => handleBlur(key)}
                placeholder={placeholder}
                error={isInvalid}
                success={isValid}
                className={cn(
                  'bg-white/[0.04] border-white/[0.08] backdrop-blur-xl transition-all duration-200',
                  isValid && 'border-emerald-500/30 focus-visible:border-emerald-500/50',
                  isInvalid && 'border-destructive/30',
                )}
              />
                {isInvalid && val?.message && (
                  <p
                    className="text-[11px] text-destructive/80 mt-1 flex items-center gap-1"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {val.message}
                  </p>
                )}
                {!isInvalid && hint && touchedFields.has(key) && val?.status !== 'valid' && (
                  <p
                    className="text-[11px] text-muted-foreground/40 mt-1"
                  >
                    {hint}
                  </p>
                )}
            </div>
          );
        })}
      </div>

      {/* Skip hint */}
      <div
        className="text-center space-y-1"
      >
        <p className="text-xs text-muted-foreground/40">
          Je kunt dit later altijd aanpassen in Instellingen
        </p>
        {validCount < 3 && (
          <p className="text-[11px] text-amber-500/60 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Zonder bedrijfsgegevens kun je nog geen facturen versturen
          </p>
        )}
      </div>
    </div>
  );
};
