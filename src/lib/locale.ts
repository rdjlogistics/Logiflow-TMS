import type { Locale } from "date-fns";

let cachedLocale: Locale | null = null;

/**
 * Lazily loads and caches the Dutch date-fns locale.
 * Keeps ~127KB out of the main bundle.
 */
export async function getNlLocale(): Promise<Locale> {
  if (cachedLocale) return cachedLocale;
  const { nl } = await import("date-fns/locale");
  cachedLocale = nl;
  return nl;
}

/**
 * Synchronous access — returns cached locale or undefined.
 * Use after at least one async call to getNlLocale().
 */
export function getNlLocaleSync(): Locale | undefined {
  return cachedLocale ?? undefined;
}
