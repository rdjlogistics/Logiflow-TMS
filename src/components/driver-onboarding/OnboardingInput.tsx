import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  autoFocus?: boolean;
  className?: string;
  error?: string;
}

export const OnboardingInput = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus = false,
  className,
  error,
}: OnboardingInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hasValue = value.length > 0;
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={cn('relative', className)}>
      {/* Floating label */}
      <label
        className={cn(
          'absolute left-0 transition-all duration-300 pointer-events-none z-10',
          (isFocused || hasValue) ? 'text-xs text-primary -top-5 scale-[0.85]' : 'text-lg text-muted-foreground top-3.5 left-4 scale-100'
        )}
      >
        {placeholder}
      </label>

      {/* Gradient border wrapper */}
      <div
        className={cn(
          'rounded-xl transition-all duration-300',
          isFocused
            ? 'bg-gradient-to-r from-primary to-pink-500 p-[2px]'
            : error
              ? 'bg-destructive p-[2px]'
              : 'bg-border p-[1.5px]'
        )}
      >
        <div className="relative rounded-[10px] bg-background">
          <input
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoFocus={autoFocus}
            className={cn(
              'w-full bg-transparent text-lg font-semibold text-foreground px-4 py-3 rounded-[10px] outline-none',
              'placeholder:text-transparent',
              (type === 'password' || hasValue) ? 'pr-12' : ''
            )}
          />

          {/* Clear button & Password toggle */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {hasValue && type !== 'password' && (
              <button
                onClick={() => onChange('')}
                className="p-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground/30 transition-colors animate-fade-in"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {type === 'password' && hasValue && (
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground/30 transition-colors animate-fade-in"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-destructive text-sm mt-2 animate-fade-in-up">
          {error}
        </p>
      )}
    </div>
  );
};
