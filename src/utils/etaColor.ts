/**
 * Returns a Tailwind text-color class based on how the ETA compares to the time window end.
 *
 * - Green: ETA ≥ 15 min before window end
 * - Orange: ETA < 15 min before window end
 * - Red: ETA past window end
 * - Empty string: no window or unparseable
 */

const BUFFER_MINUTES = 15;

function parseHHMM(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function getEtaStatusColor(
  etaTime: string | null | undefined,
  timeWindowEnd: string | null | undefined
): string {
  if (!etaTime || !timeWindowEnd) return "";

  const etaMinutes = parseHHMM(etaTime);
  const endMinutes = parseHHMM(timeWindowEnd);

  if (etaMinutes === null || endMinutes === null) return "";

  const diff = endMinutes - etaMinutes; // positive = before end

  if (diff < 0) return "text-red-500";
  if (diff < BUFFER_MINUTES) return "text-orange-500";
  return "text-green-600";
}

/**
 * Variant that accepts eta as minutes-from-now and a time_window_end ISO/time string.
 */
export function getEtaMinutesStatusColor(
  etaMinutes: number | undefined,
  timeWindowEnd: string | null | undefined
): string {
  if (etaMinutes === undefined || !timeWindowEnd) return "";

  const now = new Date();
  const arrivalMinutes = now.getHours() * 60 + now.getMinutes() + etaMinutes;
  const endMinutes = parseHHMM(timeWindowEnd);

  if (endMinutes === null) {
    // Try parsing as ISO date
    try {
      const d = new Date(timeWindowEnd);
      if (isNaN(d.getTime())) return "";
      const endMins = d.getHours() * 60 + d.getMinutes();
      const diff = endMins - arrivalMinutes;
      if (diff < 0) return "text-red-500";
      if (diff < BUFFER_MINUTES) return "text-orange-500";
      return "text-green-600";
    } catch {
      return "";
    }
  }

  const diff = endMinutes - arrivalMinutes;
  if (diff < 0) return "text-red-500";
  if (diff < BUFFER_MINUTES) return "text-orange-500";
  return "text-green-600";
}
