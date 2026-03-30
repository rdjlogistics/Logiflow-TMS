/**
 * edgeFunctionHelper.ts — Centralized Edge Function invocation with retry & error handling
 */
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { isNetworkError } from "@/lib/apiError";

interface InvokeOptions {
  body?: Record<string, unknown>;
  /** Max retries on network error (default: 1) */
  retries?: number;
}

interface InvokeResult<T = unknown> {
  data: T | null;
  error: string | null;
  statusCode?: number;
  isNetworkError: boolean;
  isRateLimited: boolean;
  isCreditsExhausted: boolean;
}

const ERROR_MESSAGES: Record<number, string> = {
  401: "Je sessie is verlopen. Log opnieuw in.",
  403: "Je hebt geen toegang tot deze functie.",
  404: "Deze functie is niet beschikbaar.",
  429: "Te veel verzoeken. Probeer het over een paar seconden opnieuw.",
  402: "AI credits zijn op. Neem contact op met de beheerder.",
  500: "Er is een serverfout opgetreden. Probeer het later opnieuw.",
  503: "De service is tijdelijk niet beschikbaar.",
};

/**
 * Invoke a Supabase Edge Function with automatic retry on network errors
 * and structured Dutch error messages.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  const { body, retries = 1 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        let statusCode: number | undefined;
        let errorMessage = error.message || "Onbekende fout";

        if (error instanceof FunctionsHttpError) {
          statusCode = (error as any).context?.status;
          try {
            const errorBody = await (error as any).context?.json?.();
            if (errorBody?.error) errorMessage = errorBody.error;
          } catch { /* use default */ }
        }

        // Don't retry on auth/client errors
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          const friendlyMsg = ERROR_MESSAGES[statusCode] || errorMessage;
          console.error(`[${functionName}] HTTP ${statusCode}: ${errorMessage}`);
          return {
            data: null,
            error: friendlyMsg,
            statusCode,
            isNetworkError: false,
            isRateLimited: statusCode === 429,
            isCreditsExhausted: statusCode === 402,
          };
        }

        // Retry on server errors
        if (attempt < retries) {
          console.warn(`[${functionName}] Server error (attempt ${attempt + 1}/${retries + 1}), retrying...`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        return {
          data: null,
          error: ERROR_MESSAGES[statusCode || 500] || errorMessage,
          statusCode,
          isNetworkError: false,
          isRateLimited: false,
          isCreditsExhausted: false,
        };
      }

      // Check for error in response body
      if (data?.error) {
        return {
          data: null,
          error: data.error,
          isNetworkError: false,
          isRateLimited: false,
          isCreditsExhausted: false,
        };
      }

      return {
        data: data as T,
        error: null,
        isNetworkError: false,
        isRateLimited: false,
        isCreditsExhausted: false,
      };
    } catch (err) {
      lastError = err;
      if (isNetworkError(err) && attempt < retries) {
        console.warn(`[${functionName}] Network error (attempt ${attempt + 1}/${retries + 1}), retrying...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  const isNetwork = isNetworkError(lastError);
  return {
    data: null,
    error: isNetwork
      ? "Geen internetverbinding. Controleer je netwerk en probeer het opnieuw."
      : "Er is een onverwachte fout opgetreden.",
    isNetworkError: isNetwork,
    isRateLimited: false,
    isCreditsExhausted: false,
  };
}
