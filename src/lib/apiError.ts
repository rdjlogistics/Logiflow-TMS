/**
 * apiError.ts — Centralised API error handling for LogiFlow TMS.
 */

/**
 * Structured error thrown by API / Supabase calls.
 */
export class APIError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(code: string, message: string, statusCode?: number) {
    super(message);
    this.name = "APIError";
    this.code = code;
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }

    // Maintains correct prototype chain in compiled JS
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Convert a Supabase error (or any thrown value) into an APIError and rethrow it.
 * Designed to be used in catch blocks after Supabase queries.
 *
 * @throws {APIError} Always throws — return type is `never`.
 */
export function handleSupabaseError(error: unknown): never {
  if (error instanceof APIError) {
    throw error;
  }

  if (error && typeof error === "object") {
    const supabaseErr = error as Record<string, unknown>;

    const code =
      typeof supabaseErr.code === "string"
        ? supabaseErr.code
        : "SUPABASE_ERROR";

    const message =
      typeof supabaseErr.message === "string"
        ? supabaseErr.message
        : "Er is een onbekende fout opgetreden.";

    // Supabase REST errors carry an HTTP status in `status`
    const statusCode =
      typeof supabaseErr.status === "number" ? supabaseErr.status : undefined;

    throw new APIError(code, message, statusCode);
  }

  if (typeof error === "string") {
    throw new APIError("UNKNOWN_ERROR", error);
  }

  throw new APIError("UNKNOWN_ERROR", "Er is een onbekende fout opgetreden.");
}

/**
 * Returns true when the error is likely caused by a network connectivity issue.
 * Useful for showing offline-specific UI states.
 */
export function isNetworkError(error: unknown): boolean {
  if (!navigator.onLine) return true;

  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("network request failed") ||
      msg.includes("networkerror") ||
      msg.includes("load failed")
    );
  }

  if (error instanceof APIError) {
    return error.statusCode === undefined || error.statusCode === 0;
  }

  return false;
}
