import * as React from "react";
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
        {isDark ? (
          <Moon className="h-5 w-5 text-primary transition-transform duration-200" />
        ) : (
          <Sun className="h-5 w-5 text-warning transition-transform duration-200" />
        )}
      </Button>
    );
  }

  if (variant === "pill") {
    return (
      <div
        className={cn(
          "relative flex items-center p-1 rounded-full",
          "bg-muted border border-border/50",
          className
        )}
      >
        <div
          className="absolute h-8 w-8 rounded-full bg-primary shadow-sm transition-[left] duration-300 ease-out"
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

  // Dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10 rounded-xl", className)}
          aria-label="Thema wijzigen"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
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
      <div
        className={cn(
          "h-5 w-5 rounded-full flex items-center justify-center",
          "bg-card shadow-sm transition-transform duration-200 ease-out"
        )}
        style={{ transform: isDark ? "translateX(20px)" : "translateX(0)" }}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-primary" />
        ) : (
          <Sun className="h-3 w-3 text-warning" />
        )}
      </div>
    </button>
  );
}
