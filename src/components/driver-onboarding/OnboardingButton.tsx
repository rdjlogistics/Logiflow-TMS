import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
  className?: string;
}

export const OnboardingButton = ({
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  children,
  className,
}: OnboardingButtonProps) => {
  const isDisabled = disabled || loading;

  const variants = {
    primary: 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30',
    secondary: 'bg-white/10 backdrop-blur-sm text-white border border-white/20',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3',
        variants[variant],
        isDisabled && 'opacity-50 cursor-not-allowed',
        !isDisabled && variant === 'primary' && 'hover:shadow-xl hover:shadow-pink-500/40 active:scale-[0.98]',
        !isDisabled && variant === 'secondary' && 'hover:bg-white/20',
        className
      )}
      whileHover={!isDisabled ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : children ? (
        children
      ) : (
        <ArrowRight className="w-5 h-5" />
      )}
    </motion.button>
  );
};
