// Utility to hard-clear corrupted auth state from browser storage.
// This is intentionally conservative: it only removes known auth keys
// rather than wiping all application data.

export function clearAuthStorage(): void {
  try {
    const ls = window.localStorage;
    const ss = window.sessionStorage;

    const shouldRemoveKey = (key: string) => {
      // Supabase v2 default key format: sb-<projectRef>-auth-token
      // projectRef is usually lowercase alphanumeric, but we stay permissive.
      if (/^sb-[a-z0-9-]+-auth-token$/i.test(key)) return true;

      // Other known/legacy keys
      if (key === 'supabase.auth.token') return true;
      if (key.startsWith('supabase.auth.')) return true;

      // Defensive: any key that looks like an auth token cache
      if (key.toLowerCase().includes('auth-token') && key.toLowerCase().startsWith('sb-')) return true;

      return false;
    };

    // localStorage
    for (let i = ls.length - 1; i >= 0; i--) {
      const key = ls.key(i);
      if (key && shouldRemoveKey(key)) ls.removeItem(key);
    }

    // sessionStorage
    for (let i = ss.length - 1; i >= 0; i--) {
      const key = ss.key(i);
      if (key && shouldRemoveKey(key)) ss.removeItem(key);
    }
  } catch {
    // no-op
  }
}

/**
 * Surgical cache clear for logout flows.
 * Does NOT destroy the Service Worker — it stays active for asset caching.
 * Only clears auth-related storage (cookies, tokens).
 */
export async function clearAuthCachesOnly(): Promise<void> {
  try {
    clearAuthStorage();
    // Clear cookies (best-effort)
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  } catch {
    // no-op
  }
}

/**
 * Nuclear option: fully deregister SW and wipe all caches.
 * Only used for fatal error recovery (e.g. chunk-load failures).
 */
export async function clearServiceWorkerAndCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // no-op
  }
}
