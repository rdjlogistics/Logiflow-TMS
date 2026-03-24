import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// ============================================
// Animated Theme Toggle (UX Enhancement)
// ============================================

interface ThemeToggleProps {
  variant?: "icon" | "pill" | "dropdown";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("h-10 w-10", className)} disabled>
        <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  // Icon variant - simple toggle
  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "h-10 w-10 rounded-xl",
          "hover:bg-muted transition-colors",
          "touch-manipulation active:scale-95",
          className
        )}
        aria-label={isDark ? "Lichte modus" : "Donkere modus"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isDark ? "dark" : "light"}
            initial={{ y: -10, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 10, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
          >
            {isDark ? (
              <Moon className="h-5 w-5 text-primary" />
            ) : (
              <Sun className="h-5 w-5 text-warning" />
            )}
          </motion.div>
        </AnimatePresence>
      </Button>
    );
  }

  // Pill variant - animated background
  if (variant === "pill") {
    return (
      <div
        className={cn(
          "relative flex items-center p-1 rounded-full",
          "bg-muted border border-border/50",
          className
        )}
      >
        <motion.div
          className="absolute h-8 w-8 rounded-full bg-primary shadow-sm"
          layoutId="theme-indicator"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ left: isDark ? "calc(100% - 2.25rem)" : "0.25rem" }}
        />
        
        <button
          onClick={() => setTheme("light")}
          className={cn(
            "relative z-10 h-8 w-8 rounded-full flex items-center justify-center",
            "transition-colors touch-manipulation",
            !isDark && "text-primary-foreground"
          )}
          aria-label="Lichte modus"
        >
          <Sun className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => setTheme("dark")}
          className={cn(
            "relative z-10 h-8 w-8 rounded-full flex items-center justify-center",
            "transition-colors touch-manipulation",
            isDark && "text-primary-foreground"
          )}
          aria-label="Donkere modus"
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Dropdown variant - includes system option
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10 rounded-xl", className)}
          aria-label="Thema wijzigen"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={resolvedTheme}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {resolvedTheme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </motion.div>
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={cn(theme === "light" && "bg-muted")}
        >
          <Sun className="mr-2 h-4 w-4" />
          Licht
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={cn(theme === "dark" && "bg-muted")}
        >
          <Moon className="mr-2 h-4 w-4" />
          Donker
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={cn(theme === "system" && "bg-muted")}
        >
          <Monitor className="mr-2 h-4 w-4" />
          Systeem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================
// Compact Theme Toggle for Headers
// ============================================

export function CompactThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative h-6 w-11 rounded-full p-0.5",
        "bg-muted border border-border/50",
        "transition-colors touch-manipulation",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Schakel naar lichte modus" : "Schakel naar donkere modus"}
    >
      <motion.div
        className={cn(
          "h-5 w-5 rounded-full flex items-center justify-center",
          "bg-card shadow-sm"
        )}
        animate={{ x: isDark ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isDark ? "moon" : "sun"}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.15 }}
          >
            {isDark ? (
              <Moon className="h-3 w-3 text-primary" />
            ) : (
              <Sun className="h-3 w-3 text-warning" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
