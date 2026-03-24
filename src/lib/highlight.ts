/**
 * highlight.ts — Search term highlighting utility.
 *
 * Usage:
 *   const html = highlightText("Levering Amsterdam", "amster")
 *   // → "Levering <mark class="highlight">Amster</mark>dam"
 *
 * The returned string is HTML — render with dangerouslySetInnerHTML.
 * All input text is HTML-escaped before processing so injection is not possible.
 */

/**
 * Escape a string for safe HTML insertion.
 * Replaces &, <, >, ", ' with their HTML entity equivalents.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape a string for safe use inside a RegExp pattern.
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Highlight all occurrences of `query` in `text`.
 *
 * @param text  - The plain text to search within
 * @param query - The search query (case-insensitive)
 * @returns HTML string with matches wrapped in <mark class="highlight"> tags
 */
export function highlightText(text: string, query: string): string {
  if (!query || !query.trim()) {
    return escapeHtml(text);
  }

  const escapedQuery = escapeRegExp(query.trim());
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  // Split text into segments (matched / unmatched)
  const parts = text.split(regex);

  return parts
    .map((part) => {
      if (regex.test(part)) {
        // Reset lastIndex after test() call
        regex.lastIndex = 0;
        return `<mark class="highlight">${escapeHtml(part)}</mark>`;
      }
      regex.lastIndex = 0;
      return escapeHtml(part);
    })
    .join("");
}
