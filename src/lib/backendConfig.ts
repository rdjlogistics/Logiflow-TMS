/**
 * Centralized backend configuration.
 *
 * Resolves VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY at runtime,
 * with compile-time fallbacks injected via vite.config.ts `define`.
 *
 * Import this instead of reading `import.meta.env.VITE_SUPABASE_*` directly.
 */

const FALLBACK_URL = "https://mlhcjccvgsexkwryfcnp.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1saGNqY2N2Z3NleGt3cnlmY25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjM5NzcsImV4cCI6MjA4MjYzOTk3N30.vi8ip9bI_xTQc_O3w5xL4kwSIb1cRyz5tF1V7g4XLjw";

export const backendUrl: string =
  import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;

export const backendAnonKey: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const isFallback =
  !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Helper: build a full edge-function URL */
export const edgeFunctionUrl = (fnName: string) =>
  `${backendUrl}/functions/v1/${fnName}`;
