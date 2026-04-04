import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

/**
 * ═══════════════════════════════════════════════════════════════
 * RESILIENT BOOT SEQUENCE v3 — Dynamic Import + Error Recovery
 * ═══════════════════════════════════════════════════════════════
 * 
 * App is loaded via dynamic import() so that if the Supabase
 * client (or any other top-level module) throws, we catch it
 * and render a clear Dutch error page instead of a blank screen.
 * ═══════════════════════════════════════════════════════════════
 */

import { initErrorRecoverySystem } from "./lib/errorRecoverySystem";
import { initErrorReporter } from "./lib/errorReporter";

try {
  initErrorRecoverySystem();
  initErrorReporter();
} catch (error) {
  console.error('[Boot] Failed to initialize error recovery:', error);
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found. Application cannot start.");
}

// Remove the static boot-fallback as soon as React takes over
const removeFallback = () => {
  const fallback = document.getElementById("boot-fallback");
  if (fallback) fallback.remove();
};

// Render a clear error page when the app fails to load
function renderBootError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
  const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const usingFallback = !hasSupabaseUrl || !hasSupabaseKey;

  container!.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;">
      <div style="max-width:480px;width:100%;text-align:center;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:16px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);margin-bottom:24px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
        </div>
        <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">LogiFlow kan niet opstarten</h1>
        <p style="font-size:14px;color:#94a3b8;margin:0 0 20px;line-height:1.6;">
          De app kon niet worden geladen. Dit komt meestal doordat de backend-configuratie ontbreekt na een publicatie.
        </p>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;text-align:left;margin-bottom:20px;">
          <p style="font-size:12px;color:#64748b;margin:0 0 8px;font-weight:500;">DIAGNOSE</p>
           <p style="font-size:13px;color:#cbd5e1;margin:0 0 6px;">
             Backend URL: <span style="color:${hasSupabaseUrl ? '#4ade80' : '#fbbf24'}">${hasSupabaseUrl ? '✓ aanwezig' : '⚠ fallback actief'}</span>
           </p>
           <p style="font-size:13px;color:#cbd5e1;margin:0 0 6px;">
             Backend Key: <span style="color:${hasSupabaseKey ? '#4ade80' : '#fbbf24'}">${hasSupabaseKey ? '✓ aanwezig' : '⚠ fallback actief'}</span>
           </p>
          <details style="margin-top:10px;">
            <summary style="font-size:12px;color:#64748b;cursor:pointer;">Technische fout</summary>
            <pre style="font-size:11px;color:#f87171;margin-top:8px;white-space:pre-wrap;word-break:break-all;background:rgba(239,68,68,0.05);padding:8px;border-radius:6px;">${message}</pre>
          </details>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button onclick="localStorage.clear();sessionStorage.clear();location.reload()" style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;background:rgba(255,255,255,0.1);color:#e2e8f0;border:1px solid rgba(255,255,255,0.15);cursor:pointer;font-size:14px;font-weight:500;">
            Sessie resetten
          </button>
          <button onclick="location.reload()" style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;background:rgba(59,130,246,0.2);color:#93c5fd;border:1px solid rgba(59,130,246,0.3);cursor:pointer;font-size:14px;font-weight:500;">
            Pagina verversen
          </button>
        </div>
        <p style="font-size:12px;color:#475569;margin-top:20px;">
          Publiceer opnieuw via Lovable om de backend-configuratie te herstellen.
        </p>
      </div>
    </div>
  `;
}

// Dynamic import — catches any top-level crash in the App module tree
async function boot() {
  try {
    const { default: App } = await import("./App.tsx");
    removeFallback();
    createRoot(container!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error("[Boot] Fatal error loading App:", error);
    removeFallback();
    renderBootError(error);
  }
}

boot();
