import { useMemo } from "react";
import { useUserRole } from "./useUserRole";

/**
 * usePermissions — RBAC hook for LogiFlow TMS
 *
 * Wraps useUserRole and exposes granular permission flags used throughout
 * the app for sidebar filtering, button visibility, and route protection.
 *
 * Roles:
 *   admin       — full access to everything
 *   medewerker  — operations + planning, NO financial admin or system settings
 *   chauffeur   — driver portal + own trips only
 *   klant       — customer portal only
 */
export const usePermissions = () => {
  const { role, loading, error, isAdmin, isMedewerker, isChauffeur, isKlant, refetch } = useUserRole();

  // hasRole: generic predicate for a single role string
  const hasRole = useMemo(
    () => (r: "admin" | "medewerker" | "chauffeur" | "klant") => role === r,
    [role]
  );

  // ── Section-level access ───────────────────────────────────────────────
  /** Can see operations (orders, trips, tracking, dispatch, etc.) */
  const canAccessOperations = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Can see planning (shifts, programs, availability, etc.) */
  const canAccessPlanning = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Can see fleet management (vehicles, maintenance, CO₂, fuel) */
  const canAccessFleet = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Can see analytics & monitoring (KPI, SLA, exceptions, alerts) */
  const canAccessAnalytics = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Can see CRM & relaties */
  const canAccessCRM = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Can see WMS */
  const canAccessWMS = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Can see Tendering & Pricing */
  const canAccessTendering = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Can see financial admin (invoices, purchase invoices, cashflow, etc.) */
  const canAccessFinance = useMemo(() => isAdmin, [isAdmin]);

  /** Can see admin panel and system settings */
  const canAccessAdmin = useMemo(() => isAdmin, [isAdmin]);

  /** Can see community / network features */
  const canAccessCommunity = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Can see driver portal */
  const canAccessDriverPortal = useMemo(
    () => isAdmin || isMedewerker || isChauffeur,
    [isAdmin, isMedewerker, isChauffeur]
  );

  /** Can see customer portal */
  const canAccessCustomerPortal = useMemo(
    () => isAdmin || isMedewerker || isKlant,
    [isAdmin, isMedewerker, isKlant]
  );

  // ── Button-level permissions ──────────────────────────────────────────
  /** Verwijder knoppen — alleen admin */
  const canDelete = useMemo(() => isAdmin, [isAdmin]);

  /** Factuur aanmaken — admin of medewerker */
  const canCreateInvoice = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Instellingen bekijken/wijzigen — alleen admin */
  const canAccessSettings = useMemo(() => isAdmin, [isAdmin]);

  /** AI assistent (ChatGPT) — admin of medewerker */
  const canAccessChatGPT = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Kan order aanmaken / bewerken */
  const canCreateOrder = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Kan ritten / trips beheren */
  const canManageTrips = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  /** Kan chauffeurs beheren */
  const canManageDrivers = useMemo(
    () => isAdmin || isMedewerker,
    [isAdmin, isMedewerker]
  );

  return {
    // raw role info
    role,
    loading,
    error,

    // role flags
    isAdmin,
    isMedewerker,
    isChauffeur,
    isKlant,
    hasRole,

    // section access
    canAccessOperations,
    canAccessPlanning,
    canAccessFleet,
    canAccessAnalytics,
    canAccessCRM,
    canAccessWMS,
    canAccessTendering,
    canAccessFinance,
    canAccessAdmin,
    canAccessCommunity,
    canAccessDriverPortal,
    canAccessCustomerPortal,

    // button-level
    canDelete,
    canCreateInvoice,
    canAccessSettings,
    canAccessChatGPT,
    canCreateOrder,
    canManageTrips,
    canManageDrivers,

    // utils
    refetch,
  };
};

export type Permissions = ReturnType<typeof usePermissions>;
