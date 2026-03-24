import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Premium animation variants
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 }
  }
};

export const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
  }
};

export const tableRowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
  }
};

export const shimmerVariants = {
  initial: { x: '-100%' },
  animate: { 
    x: '100%',
    transition: { 
      repeat: Infinity, 
      duration: 3.5, 
      ease: 'linear',
      repeatDelay: 1.5
    }
  }
};

interface PremiumGlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "highlight" | "success" | "warning" | "premium" | "crystal";
  hoverable?: boolean;
  glow?: boolean;
}

export const PremiumGlassCard = ({ 
  children, 
  className,
  variant = "default",
  hoverable = false,
  glow = false,
}: PremiumGlassCardProps) => {
  const variantStyles = {
    default: "bg-card/70 border-border/40",
    highlight: "bg-primary/5 border-primary/25",
    success: "bg-emerald-500/5 border-emerald-500/25",
    warning: "bg-amber-500/5 border-amber-500/25",
    premium: "bg-gradient-to-br from-card/80 via-card/70 to-primary/5 border-primary/20",
    crystal: "bg-gradient-to-br from-card/90 via-card/80 to-accent/5 border-accent/20",
  };

  const glowStyles = glow ? {
    default: "shadow-[0_0_40px_-15px_hsl(var(--primary)/0.3)]",
    highlight: "shadow-[0_0_50px_-15px_hsl(var(--primary)/0.4)]",
    success: "shadow-[0_0_40px_-15px_hsl(var(--success)/0.35)]",
    warning: "shadow-[0_0_40px_-15px_hsl(var(--warning)/0.35)]",
    premium: "shadow-[0_0_60px_-20px_hsl(var(--primary)/0.45)]",
    crystal: "shadow-[0_0_60px_-20px_hsl(var(--accent)/0.35)]",
  } : {};

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "relative overflow-hidden rounded-2xl backdrop-blur-2xl border shadow-xl transition-all duration-500",
        variantStyles[variant],
        glow && glowStyles[variant],
        hoverable && "hover:shadow-2xl hover:scale-[1.01] hover:border-primary/40 cursor-pointer",
        className
      )}
      whileHover={hoverable ? { y: -2 } : undefined}
    >
      {/* Premium multi-layer gradient highlights */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/20 via-transparent to-transparent" />
      
      {/* Animated shimmer effect */}
      <motion.div
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none"
      />
      
      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)] pointer-events-none" />
      
      {children}
    </motion.div>
  );
};

// Premium Section Header with icon glow
interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: React.ReactNode;
  description?: string;
}

export const SectionHeader = ({ 
  icon: Icon, 
  title,
  badge,
  description,
}: SectionHeaderProps) => (
  <div className="flex items-center justify-between p-6 pb-2">
    <div className="flex items-center gap-4">
      <motion.div 
        className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary shadow-lg shadow-primary/20"
        whileHover={{ scale: 1.05, rotate: 3 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Icon className="h-5 w-5" />
        <div className="absolute inset-0 rounded-xl bg-primary/10 blur-xl animate-pulse" />
      </motion.div>
      <div>
        <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
    {badge}
  </div>
);

// Premium Data Row with animations
interface DataRowProps {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}

export const DataRow = ({ 
  label, 
  value, 
  highlight,
  icon: Icon,
  valueClassName,
}: DataRowProps) => (
  <motion.div 
    className="flex items-center justify-between py-3 group"
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
  >
    <span className={cn(
      "text-sm flex items-center gap-2.5 transition-colors duration-300",
      highlight ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground/80"
    )}>
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </span>
    <span className={cn(
      "text-sm font-medium transition-all duration-300",
      highlight ? "text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent" : "text-foreground",
      valueClassName
    )}>
      {value}
    </span>
  </motion.div>
);
