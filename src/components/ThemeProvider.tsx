import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { useAuth } from "@/hooks/useAuth";

type Theme = "dark" | "light" | "system" | "auto";
export type ThemePreset = "imperial" | "vision-pro" | "horizon" | "carbon" | "aurora" | "ios";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "light";
  themePreset: ThemePreset;
  setThemePreset: (preset: ThemePreset) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  resolvedTheme: "dark",
  themePreset: "ios",
  setThemePreset: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const PRESET_STORAGE_KEY = "nextgen-tms-theme-preset";
const PRESET_CLASSES = ["theme-vision-pro", "theme-horizon", "theme-carbon", "theme-aurora", "theme-ios"] as const;

const isNightTime = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7;
};

const isValidPreset = (v: string | null): v is ThemePreset =>
  v === "imperial" || v === "vision-pro" || v === "horizon" || v === "carbon" || v === "aurora" || v === "ios";

const isValidTheme = (v: string | null): v is Theme =>
  v === "dark" || v === "light" || v === "system" || v === "auto";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "nextgen-tms-theme",
  ...props
}: ThemeProviderProps) {
  const { user, authReady } = useAuth();
  const { data: tenantSettings } = useTenantSettings({
    enabled: authReady && !!user,
  });

  // Resolve initial values: localStorage → tenant DB → default
  const [theme, setTheme] = useState<Theme>(() => {
    const local = localStorage.getItem(storageKey);
    if (isValidTheme(local)) return local;
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  const [themePreset, setThemePresetState] = useState<ThemePreset>(() => {
    const local = localStorage.getItem(PRESET_STORAGE_KEY);
    if (isValidPreset(local)) return local;
    return "ios";
  });

  const isUserTriggered = useRef(false);
  const tenantApplied = useRef(false);

  // Apply tenant defaults when loaded (only once, and only if user hasn't set a local override)
  useEffect(() => {
    if (!tenantSettings || tenantApplied.current) return;
    tenantApplied.current = true;

    const localPreset = localStorage.getItem(PRESET_STORAGE_KEY);
    const localTheme = localStorage.getItem(storageKey);

    if (!localPreset && isValidPreset(tenantSettings.theme_preset)) {
      setThemePresetState(tenantSettings.theme_preset as ThemePreset);
    }

    if (!localTheme && isValidTheme(tenantSettings.theme_mode)) {
      setTheme(tenantSettings.theme_mode as Theme);
    }
  }, [tenantSettings, storageKey]);

  // Mouse parallax — only active for vision-pro preset
  useMouseParallax(themePreset === "vision-pro");

  // Apply theme preset class + dynamically load CSS
  useEffect(() => {
    const root = window.document.documentElement;
    PRESET_CLASSES.forEach((cls) => root.classList.remove(cls));
    if (themePreset !== "imperial") {
      root.classList.add(`theme-${themePreset}`);
      // Dynamically load the theme CSS file
      const themeImports: Record<string, () => Promise<unknown>> = {
        "vision-pro": () => import("@/styles/theme-vision-pro.css"),
        "horizon": () => import("@/styles/theme-horizon.css"),
        "carbon": () => import("@/styles/theme-carbon.css"),
        "aurora": () => import("@/styles/theme-aurora.css"),
        "ios": () => import("@/styles/theme-ios.css"),
      };
      themeImports[themePreset]?.();
    }
  }, [themePreset]);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (animate = false) => {
      let effectiveTheme: "dark" | "light";

      if (theme === "system") {
        effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } else if (theme === "auto") {
        effectiveTheme = isNightTime() ? "dark" : "light";
      } else {
        effectiveTheme = theme;
      }

      const updateDOM = () => {
        root.classList.remove("light", "dark");
        root.classList.add(effectiveTheme);
        setResolvedTheme(effectiveTheme);
      };

      if (animate && document.startViewTransition) {
        document.startViewTransition(updateDOM);
      } else if (animate) {
        root.classList.add("theme-transitioning");
        updateDOM();
        setTimeout(() => root.classList.remove("theme-transitioning"), 500);
      } else {
        updateDOM();
      }
    };

    const shouldAnimate = isUserTriggered.current;
    isUserTriggered.current = false;
    applyTheme(shouldAnimate);

    let interval: NodeJS.Timeout | undefined;
    if (theme === "auto") {
      interval = setInterval(() => applyTheme(false), 60000);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme(true);
      }
    };
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      if (interval) clearInterval(interval);
    };
  }, [theme]);

  const setThemePreset = (preset: ThemePreset) => {
    isUserTriggered.current = true;
    localStorage.setItem(PRESET_STORAGE_KEY, preset);

    const updatePreset = () => {
      setThemePresetState(preset);
    };

    if (document.startViewTransition) {
      document.startViewTransition(updatePreset);
    } else {
      updatePreset();
    }
  };

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      isUserTriggered.current = true;
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
    resolvedTheme,
    themePreset,
    setThemePreset,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
