/**
 * Lightweight browser fingerprint generator for fraud detection.
 * No external dependencies — uses native browser APIs.
 * Generates a hash string from canvas, timezone, screen, and platform data.
 */

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('LogiFlow FP', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('LogiFlow FP', 4, 17);

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

/**
 * Generate a browser fingerprint hash.
 * Returns a SHA-256 hex string.
 */
export async function generateFingerprint(): Promise<string> {
  const components = [
    // Canvas rendering
    getCanvasFingerprint(),
    // Timezone
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Screen
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    // Platform & language
    navigator.platform,
    navigator.language,
    // Hardware hints
    `${navigator.hardwareConcurrency || 'unknown'}`,
    // Touch support
    `touch:${navigator.maxTouchPoints || 0}`,
  ];

  return hashString(components.join('|'));
}
