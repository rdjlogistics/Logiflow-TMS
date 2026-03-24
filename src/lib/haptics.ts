/**
 * Haptic feedback utility for native-like interactions
 * Only triggers when Vibration API is supported
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  selection: 5,
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
};

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback
 * @param style - The haptic style to use
 */
export function haptic(style: HapticStyle = 'light'): void {
  if (!isHapticSupported()) return;
  
  try {
    const pattern = HAPTIC_PATTERNS[style];
    navigator.vibrate(pattern);
  } catch {
    // Silently fail if vibration is blocked
  }
}

/**
 * Trigger haptic feedback for selection events
 */
export function hapticSelection(): void {
  haptic('selection');
}

/**
 * Trigger haptic feedback for navigation start
 */
export function hapticNavigate(): void {
  haptic('medium');
}

/**
 * Trigger haptic feedback for style/mode switch
 */
export function hapticSwitch(): void {
  haptic('light');
}

/**
 * Trigger haptic feedback for success
 */
export function hapticSuccess(): void {
  haptic('success');
}

/**
 * Trigger haptic feedback for errors
 */
export function hapticError(): void {
  haptic('error');
}
