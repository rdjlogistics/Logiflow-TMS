/**
 * Typed helper aliases for Supabase database entities.
 * 
 * Usage:
 *   import type { Trip, TripInsert, TripStatus } from "@/types/supabase-helpers";
 * 
 * These map directly to the auto-generated Database type in
 * src/integrations/supabase/types.ts — no duplication, just convenience aliases.
 */
import type { Database } from "@/integrations/supabase/types";

// ─── Table helpers ───────────────────────────────────────────────────
type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

// Row / Insert / Update helpers (generic)
export type TableRow<T extends keyof Tables> = Tables[T]["Row"];
export type TableInsert<T extends keyof Tables> = Tables[T]["Insert"];
export type TableUpdate<T extends keyof Tables> = Tables[T]["Update"];

// ─── Core entity Row types ───────────────────────────────────────────
export type Trip = Tables["trips"]["Row"];
export type TripInsert = Tables["trips"]["Insert"];
export type TripUpdate = Tables["trips"]["Update"];

export type Customer = Tables["customers"]["Row"];
export type CustomerInsert = Tables["customers"]["Insert"];
export type CustomerUpdate = Tables["customers"]["Update"];

export type Driver = Tables["drivers"]["Row"];
export type DriverInsert = Tables["drivers"]["Insert"];

export type Vehicle = Tables["vehicles"]["Row"];
export type VehicleInsert = Tables["vehicles"]["Insert"];

export type Invoice = Tables["invoices"]["Row"];
export type InvoiceInsert = Tables["invoices"]["Insert"];
export type InvoiceUpdate = Tables["invoices"]["Update"];

export type RouteStop = Tables["route_stops"]["Row"];
export type RouteStopInsert = Tables["route_stops"]["Insert"];
export type RouteStopUpdate = Tables["route_stops"]["Update"];

export type Company = Tables["companies"]["Row"];
export type Profile = Tables["profiles"]["Row"];

export type Carrier = Tables["carriers"]["Row"];
export type CarrierInsert = Tables["carriers"]["Insert"];
export type CarrierUpdate = Tables["carriers"]["Update"];

export type OrderEvent = Tables["order_events"]["Row"];
export type OrderEventInsert = Tables["order_events"]["Insert"];

export type ChatMessage = Tables["chat_messages"]["Row"];
export type ComplianceDocument = Tables["compliance_documents"]["Row"];

export type OrderGoods = Tables["order_goods"]["Row"];
export type OrderGoodsInsert = Tables["order_goods"]["Insert"];
export type OrderGoodsUpdate = Tables["order_goods"]["Update"];

export type ProofOfDelivery = Tables["proof_of_delivery"]["Row"];
export type ProofOfDeliveryInsert = Tables["proof_of_delivery"]["Insert"];

export type ClaimCase = Tables["claim_cases"]["Row"];
export type ClaimCaseInsert = Tables["claim_cases"]["Insert"];
export type ClaimCaseUpdate = Tables["claim_cases"]["Update"];

export type ChainOfCustodyEvent = Tables["chain_of_custody_events"]["Row"];

export type MigrationProject = Tables["migration_projects"]["Row"];
export type MigrationProjectInsert = Tables["migration_projects"]["Insert"];
export type MigrationProjectUpdate = Tables["migration_projects"]["Update"];

export type MigrationConnector = Tables["migration_connectors"]["Row"];
export type MigrationConnectorInsert = Tables["migration_connectors"]["Insert"];

export type MigrationProfile = Tables["migration_profiles"]["Row"];
export type MigrationProfileInsert = Tables["migration_profiles"]["Insert"];
export type MigrationProfileUpdate = Tables["migration_profiles"]["Update"];

export type MigrationBatch = Tables["migration_batches"]["Row"];
export type MigrationBatchInsert = Tables["migration_batches"]["Insert"];
export type MigrationBatchUpdate = Tables["migration_batches"]["Update"];

export type StagingRecord = Tables["staging_records"]["Row"];
export type StagingRecordUpdate = Tables["staging_records"]["Update"];

export type ReconciliationIssue = Tables["reconciliation_issues"]["Row"];
export type ReconciliationIssueUpdate = Tables["reconciliation_issues"]["Update"];

export type DualRunSync = Tables["dual_run_syncs"]["Row"];
export type DualRunSyncInsert = Tables["dual_run_syncs"]["Insert"];
export type DualRunSyncUpdate = Tables["dual_run_syncs"]["Update"];

export type ProgramShift = Tables["program_shifts"]["Row"];

// ─── Enum types ──────────────────────────────────────────────────────
export type TripStatus = Enums["trip_status"];
export type AppRole = Enums["app_role"];
export type ClaimStatusEnum = Enums["claim_status"];
export type ClaimTypeEnum = Enums["claim_type"];
export type ClaimLiabilityEnum = Enums["claim_liability"];
export type CustodyEventType = Enums["custody_event_type"];
export type ExceptionType = Enums["exception_type"];
export type ExceptionSeverity = Enums["exception_severity"];
export type DispatchStatus = Enums["dispatch_status"];
export type ComplianceDocStatus = Enums["compliance_doc_status"];
export type ComplianceEntityType = Enums["compliance_entity_type"];
export type ContractStatus = Enums["contract_status"];
export type DualRunStatus = Enums["dual_run_status"];
