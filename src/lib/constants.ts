/**
 * constants.ts — App-wide constants for LogiFlow TMS.
 *
 * Import specific constants as needed:
 *   import { PLANS, COMPANY_NAME } from "@/lib/constants";
 */

// ── App identity ──────────────────────────────────────────────────────────────

export const COMPANY_NAME = "LogiFlow" as const;

// ── Subscription plans (monthly price in EUR) ─────────────────────────────────

export const PLANS = {
  SOLO: { slug: "solo" as const, monthly: 29, yearly: 24, name: "Solo" },
  STARTER: { slug: "starter" as const, monthly: 79, yearly: 66, name: "Starter" },
  GROWTH: { slug: "growth" as const, monthly: 159, yearly: 133, name: "Growth" },
  SCALE: { slug: "scale" as const, monthly: 299, yearly: 249, name: "Scale" },
} as const;

export type PlanKey = keyof typeof PLANS;
export type PlanSlug = (typeof PLANS)[PlanKey]["slug"];

// ── File handling ─────────────────────────────────────────────────────────────

/** Maximum upload size: 10 MB */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** MIME types accepted for document uploads */
export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// ── Localisation ──────────────────────────────────────────────────────────────

export const DEFAULT_LOCALE = "nl-NL" as const;

export const DATE_FORMAT = "dd-MM-yyyy" as const;

export const DATETIME_FORMAT = "dd-MM-yyyy HH:mm" as const;

/** ISO 4217 currency codes supported by LogiFlow */
export const SUPPORTED_CURRENCIES = ["EUR"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// ── Pagination ────────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 25;

export const MAX_PAGE_SIZE = 250;

// ── Multi-tenant ──────────────────────────────────────────────────────────────

/** Supabase row default query limit */
export const SUPABASE_DEFAULT_LIMIT = 1000;

// ── Feature storage keys ──────────────────────────────────────────────────────

export const FEATURE_FLAG_PREFIX = "logiflow_feature_" as const;
