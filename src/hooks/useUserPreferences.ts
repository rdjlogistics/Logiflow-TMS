import { useState, useCallback, useEffect } from 'react';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface DashboardWidgetConfig {
  id: string;
  size: WidgetSize;
}

interface UserPreferences {
  // Theme
  theme: 'light' | 'dark' | 'system';
  themePreset: 'imperial' | 'vision-pro' | 'horizon' | 'carbon';
  
  // Dashboard - Enhanced with widget configs
  dashboardWidgets: DashboardWidgetConfig[];
  compactMode: boolean;
  
  // Tables
  defaultPageSize: number;
  showFilters: boolean;
  
  // Notifications
  soundEnabled: boolean;
  browserNotifications: boolean;
  emailDigest: 'none' | 'daily' | 'weekly';
  
  // Sidebar
  sidebarCollapsed: boolean;
  pinnedMenuItems: string[];
  
  // Locale
  language: 'nl' | 'en' | 'de';
  dateFormat: 'dd-MM-yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
  currency: 'EUR' | 'USD' | 'GBP';
  
  // Keyboard shortcuts
  shortcuts: Record<string, string>;
}

const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'fleet-map', size: 'large' },
  { id: 'performance-metrics', size: 'medium' },
  { id: 'action-queue', size: 'large' },
  { id: 'alerts-widget', size: 'medium' },
  { id: 'finance-snapshot', size: 'medium' },
  { id: 'trends-widget', size: 'large' },
  { id: 'smart-insights', size: 'medium' },
  { id: 'geographic-heatmap', size: 'medium' },
];

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  themePreset: 'imperial',
  dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
  compactMode: false,
  defaultPageSize: 25,
  showFilters: true,
  soundEnabled: true,
  browserNotifications: true,
  emailDigest: 'daily',
  sidebarCollapsed: false,
  pinnedMenuItems: ['orders', 'trips', 'customers'],
  language: 'nl',
  dateFormat: 'dd-MM-yyyy',
  currency: 'EUR',
  shortcuts: {
    'search': 'cmd+k',
    'newOrder': 'cmd+n',
    'save': 'cmd+s',
    'undo': 'cmd+z',
    'redo': 'cmd+shift+z',
  },
};

const STORAGE_KEY = 'tms-user-preferences';

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {}
    return DEFAULT_PREFERENCES;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const resetPreference = useCallback(<K extends keyof UserPreferences>(key: K) => {
    setPreferences((prev) => ({ ...prev, [key]: DEFAULT_PREFERENCES[key] }));
  }, []);

  // Dashboard widget management - Enhanced
  const addWidget = useCallback((widgetId: string, size: WidgetSize = 'medium') => {
    setPreferences((prev) => ({
      ...prev,
      dashboardWidgets: [...prev.dashboardWidgets, { id: widgetId, size }],
    }));
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setPreferences((prev) => ({
      ...prev,
      dashboardWidgets: prev.dashboardWidgets.filter((w) => w.id !== widgetId),
    }));
  }, []);

  const reorderWidgets = useCallback((widgets: DashboardWidgetConfig[]) => {
    setPreferences((prev) => ({
      ...prev,
      dashboardWidgets: widgets,
    }));
  }, []);

  const resizeWidget = useCallback((widgetId: string, newSize: WidgetSize) => {
    setPreferences((prev) => ({
      ...prev,
      dashboardWidgets: prev.dashboardWidgets.map((w) =>
        w.id === widgetId ? { ...w, size: newSize } : w
      ),
    }));
  }, []);

  const resetDashboardWidgets = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
    }));
  }, []);

  // Pinned menu management
  const togglePinnedMenuItem = useCallback((itemId: string) => {
    setPreferences((prev) => {
      const isPinned = prev.pinnedMenuItems.includes(itemId);
      return {
        ...prev,
        pinnedMenuItems: isPinned
          ? prev.pinnedMenuItems.filter((i) => i !== itemId)
          : [...prev.pinnedMenuItems, itemId],
      };
    });
  }, []);

  // Shortcut management
  const setShortcut = useCallback((action: string, shortcut: string) => {
    setPreferences((prev) => ({
      ...prev,
      shortcuts: { ...prev.shortcuts, [action]: shortcut },
    }));
  }, []);

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
    resetPreference,
    
    // Dashboard widgets - Enhanced
    addWidget,
    removeWidget,
    reorderWidgets,
    resizeWidget,
    resetDashboardWidgets,
    
    // Pinned menu
    togglePinnedMenuItem,
    isPinned: (itemId: string) => preferences.pinnedMenuItems.includes(itemId),
    
    // Shortcuts
    setShortcut,
    getShortcut: (action: string) => preferences.shortcuts[action],
  };
}

export type { UserPreferences };
