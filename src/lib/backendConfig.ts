/**
 * Centralized backend configuration.
 *
 * Resolves VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY at runtime,
 * with compile-time fallbacks injected via vite.config.ts `define`.
 *
 * Import this instead of reading `import.meta.env.VITE_SUPABASE_*` directly.
 */

const FALLBACK_URL = "https://spycblsfcktsnepsdssv.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweWNibHNmY2t0c25lcHNkc3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1Mjk1MjcsImV4cCI6MjA4OTEwNTUyN30.OKjnyYH-JTyDQySFitR8j-jVc0yMBp-feCA3dzN-Jls";

export const backendUrl: string =
  import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;

export const backendAnonKey: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const isFallback =
  !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Helper: build a full edge-function URL */
export const edgeFunctionUrl = (fnName: string) =>
  `${backendUrl}/functions/v1/${fnName}`;
