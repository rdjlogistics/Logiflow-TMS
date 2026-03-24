import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Validation result type
interface ValidationResult {
  valid: boolean;
  message?: string;
  type?: 'error' | 'warning' | 'success' | 'info';
}

// Validator function type
type ValidatorFn = (value: string) => ValidationResult | Promise<ValidationResult>;

// Common validators
export const validators = {
  required: (message = 'Dit veld is verplicht'): ValidatorFn => 
    (value) => ({
      valid: value.trim().length > 0,
      message: value.trim().length > 0 ? undefined : message,
      type: 'error',
    }),

  email: (message = 'Ongeldig e-mailadres'): ValidatorFn =>
    (value) => {
      if (!value) return { valid: true };
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        valid: emailRegex.test(value),
        message: emailRegex.test(value) ? undefined : message,
        type: 'error',
      };
    },

  phone: (message = 'Ongeldig telefoonnummer'): ValidatorFn =>
    (value) => {
      if (!value) return { valid: true };
      const phoneRegex = /^(\+31|0)[1-9][0-9]{8}$/;
      const cleanValue = value.replace(/[\s\-]/g, '');
      return {
        valid: phoneRegex.test(cleanValue),
        message: phoneRegex.test(cleanValue) ? undefined : message,
        type: 'error',
      };
    },

  minLength: (min: number, message?: string): ValidatorFn =>
    (value) => ({
      valid: value.length >= min,
      message: value.length >= min ? undefined : message || `Minimaal ${min} karakters`,
      type: 'error',
    }),

  maxLength: (max: number, message?: string): ValidatorFn =>
    (value) => ({
      valid: value.length <= max,
      message: value.length <= max ? undefined : message || `Maximaal ${max} karakters`,
      type: 'error',
    }),

  pattern: (regex: RegExp, message: string): ValidatorFn =>
    (value) => ({
      valid: regex.test(value),
      message: regex.test(value) ? undefined : message,
      type: 'error',
    }),

  postalCode: (message = 'Ongeldige postcode (bijv. 1234 AB)'): ValidatorFn =>
    (value) => {
      if (!value) return { valid: true };
      const postalRegex = /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/;
      return {
        valid: postalRegex.test(value),
        message: postalRegex.test(value) ? undefined : message,
        type: 'error',
      };
    },

  kvkNumber: (message = 'Ongeldig KVK nummer (8 cijfers)'): ValidatorFn =>
    (value) => {
      if (!value) return { valid: true };
      const kvkRegex = /^[0-9]{8}$/;
      return {
        valid: kvkRegex.test(value),
        message: kvkRegex.test(value) ? undefined : message,
        type: 'error',
      };
    },

  btwNumber: (message = 'Ongeldig BTW nummer (bijv. NL123456789B01)'): ValidatorFn =>
    (value) => {
      if (!value) return { valid: true };
      const btwRegex = /^NL[0-9]{9}B[0-9]{2}$/i;
      return {
        valid: btwRegex.test(value),
        message: btwRegex.test(value) ? undefined : message,
        type: 'error',
      };
    },

  iban: (message = 'Ongeldig IBAN nummer'): ValidatorFn =>
    (value) => {
      if (!value) return { valid: true };
      const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/i;
      const cleanValue = value.replace(/\s/g, '');
      return {
        valid: ibanRegex.test(cleanValue),
        message: ibanRegex.test(cleanValue) ? undefined : message,
        type: 'error',
      };
    },

  number: (message = 'Voer een geldig getal in'): ValidatorFn =>
    (value) => {
      if (!value) return { valid: true };
      return {
        valid: !isNaN(parseFloat(value)),
        message: !isNaN(parseFloat(value)) ? undefined : message,
        type: 'error',
      };
    },

  positiveNumber: (message = 'Voer een positief getal in'): ValidatorFn =>
    (value) => {
      if (!value) return { valid: true };
      const num = parseFloat(value);
      return {
        valid: !isNaN(num) && num > 0,
        message: !isNaN(num) && num > 0 ? undefined : message,
        type: 'error',
      };
    },
};

// Compose multiple validators
export function composeValidators(...validatorFns: ValidatorFn[]): ValidatorFn {
  return async (value: string) => {
    for (const validate of validatorFns) {
      const result = await validate(value);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}

// Validation feedback component
interface ValidationFeedbackProps {
  result: ValidationResult | null;
  show: boolean;
  className?: string;
}

export function ValidationFeedback({ result, show, className }: ValidationFeedbackProps) {
  if (!result || !show || result.valid) return null;

  const icons = {
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
    success: Check,
  };
  const Icon = icons[result.type || 'error'];

  const colors = {
    error: 'text-destructive',
    warning: 'text-warning',
    info: 'text-info',
    success: 'text-success',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -4, height: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "flex items-center gap-1.5 mt-1.5 text-xs",
          colors[result.type || 'error'],
          className
        )}
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{result.message}</span>
      </motion.div>
    </AnimatePresence>
  );
}

// Input with inline validation
interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  hint?: string;
  validators?: ValidatorFn[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
  onValidation?: (result: ValidationResult) => void;
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  showSuccessState?: boolean;
}

export function ValidatedInput({
  label,
  hint,
  validators: validatorFns = [],
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
  onValidation,
  onChange,
  showSuccessState = false,
  className,
  ...props
}: ValidatedInputProps) {
  const [value, setValue] = useState(props.defaultValue?.toString() || '');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const validate = useCallback(async (val: string) => {
    if (validatorFns.length === 0) return;

    setIsValidating(true);
    try {
      const composedValidator = composeValidators(...validatorFns);
      const result = await composedValidator(val);
      setValidationResult(result);
      onValidation?.(result);
    } finally {
      setIsValidating(false);
    }
  }, [validatorFns, onValidation]);

  useEffect(() => {
    if (!validateOnChange || !touched) return;

    const timer = setTimeout(() => {
      validate(value);
      setShowFeedback(true);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, validateOnChange, touched, debounceMs, validate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(newValue, e);
  };

  const handleBlur = () => {
    setTouched(true);
    if (validateOnBlur) {
      validate(value);
      setShowFeedback(true);
    }
  };

  const hasError = validationResult && !validationResult.valid;
  const hasSuccess = validationResult?.valid && touched && showSuccessState;

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          {...props}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            hasError && "border-destructive focus-visible:ring-destructive",
            hasSuccess && "border-success focus-visible:ring-success",
            "pr-9",
            className
          )}
        />
        <AnimatePresence>
          {(isValidating || hasSuccess || hasError) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : hasSuccess ? (
                <Check className="h-4 w-4 text-success" />
              ) : hasError ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {hint && !showFeedback && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <ValidationFeedback result={validationResult} show={showFeedback} />
    </div>
  );
}

// Textarea with inline validation
interface ValidatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  hint?: string;
  validators?: ValidatorFn[];
  maxLength?: number;
  showCount?: boolean;
  onValidation?: (result: ValidationResult) => void;
  onChange?: (value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function ValidatedTextarea({
  label,
  hint,
  validators: validatorFns = [],
  maxLength,
  showCount = true,
  onValidation,
  onChange,
  className,
  ...props
}: ValidatedTextareaProps) {
  const [value, setValue] = useState(props.defaultValue?.toString() || '');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback(async (val: string) => {
    if (validatorFns.length === 0) return;

    const composedValidator = composeValidators(...validatorFns);
    const result = await composedValidator(val);
    setValidationResult(result);
    onValidation?.(result);
  }, [validatorFns, onValidation]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(newValue, e);
    if (touched) validate(newValue);
  };

  const handleBlur = () => {
    setTouched(true);
    validate(value);
  };

  const hasError = validationResult && !validationResult.valid && touched;
  const charCount = value.length;
  const isNearLimit = maxLength && charCount > maxLength * 0.8;
  const isOverLimit = maxLength && charCount > maxLength;

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Textarea
        {...props}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={maxLength}
        className={cn(
          hasError && "border-destructive focus-visible:ring-destructive",
          isOverLimit && "border-destructive",
          className
        )}
      />
      <div className="flex items-center justify-between text-xs">
        <div>
          {hint && !hasError && (
            <span className="text-muted-foreground">{hint}</span>
          )}
          <ValidationFeedback result={validationResult} show={touched} />
        </div>
        {showCount && maxLength && (
          <span className={cn(
            "text-muted-foreground",
            isNearLimit && "text-warning",
            isOverLimit && "text-destructive"
          )}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

export default ValidatedInput;
