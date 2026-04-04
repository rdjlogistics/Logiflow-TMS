import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Hardcoded public fallbacks — these are publishable/anon values, safe in frontend code.
const FALLBACK_SUPABASE_URL = "https://spycblsfcktsnepsdssv.supabase.co";
const FALLBACK_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNweWNibHNmY2t0c25lcHNkc3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1Mjk1MjcsImV4cCI6MjA4OTEwNTUyN30.OKjnyYH-JTyDQySFitR8j-jVc0yMBp-feCA3dzN-Jls";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_SUPABASE_URL':
      JSON.stringify(process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':
      JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_KEY),
  },
  server: {
    host: "::",
    port: 8080,
    headers: mode === "production" ? {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    } : {},
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: "RDJ Logistics - Transport Management",
        short_name: "RDJ Logistics",
        description: "Modern Transport Management System voor chauffeurs en planners",
        theme_color: "#0F172A",
        background_color: "#0F172A",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Only precache the shell: index.html, main CSS, core vendor chunks
        globPatterns: [
          "index.html",
          "assets/index-*.css",
          "assets/vendor-react-*.js",
          "assets/vendor-query-*.js",
          "assets/vendor-ui-*.js",
        ],
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          // Lazy-loaded JS chunks — cache on first use
          {
            urlPattern: /\/assets\/.*\.js$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "lazy-chunks",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapbox-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5,
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['lucide-react', 'date-fns', 'dompurify', '@tanstack/react-query'],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("node_modules/mapbox-gl")) {
            return "vendor-map";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }
          // 3d, pdf, excel, charts, animation: NOT chunked separately
          if (id.includes("node_modules/date-fns")) {
            return "vendor-date";
          }
          if (id.includes("node_modules/dompurify")) {
            return "vendor-sanitize";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          if (
            id.includes("node_modules/@radix-ui") ||
            id.includes("node_modules/cmdk") ||
            id.includes("node_modules/vaul")
          ) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/zod") || id.includes("node_modules/@hookform")) {
            return "vendor-forms";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
