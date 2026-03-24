/**
 * Defensive Runtime System v1
 * 
 * HABSBURG-GRADE PROTECTION:
 * Enterprise-class defensive coding patterns that prevent crashes at every level.
 * 
 * Features:
 * 1. Deep freeze objects to prevent accidental mutations
 * 2. Safe property access with fallbacks
 * 3. Type guards for runtime safety
 * 4. Null coalescing utilities
 * 5. Immutable operations
 * 6. Input sanitization
 */

import { logger } from './logger';

// ============= TYPE GUARDS =============

/**
 * Type guard for checking if value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Type guard for checking if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard for checking if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Type guard for checking if value is a valid object (not null, not array)
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is a finite number
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Type guard for checking if value is a valid UUID
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Type guard for checking if value is a valid date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// ============= SAFE ACCESS =============

/**
 * Safely access nested object properties with fallback
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  defaultValue: T
): T {
  try {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (!isValidObject(current) && !Array.isArray(current)) {
        return defaultValue;
      }
      current = (current as Record<string, unknown>)[key];
      if (current === undefined || current === null) {
        return defaultValue;
      }
    }

    return current as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback: T
): T {
  if (!json) return fallback;
  
  try {
    const parsed = JSON.parse(json);
    return parsed as T;
  } catch (error) {
    logger.debug('Failed to parse JSON', 'DefensiveRuntime', { error });
    return fallback;
  }
}

/**
 * Safely stringify JSON with fallback
 */
export function safeJsonStringify(
  value: unknown,
  fallback: string = '{}'
): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

// ============= IMMUTABLE OPERATIONS =============

/**
 * Deep freeze an object to prevent mutations
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  Object.getOwnPropertyNames(obj).forEach((name) => {
    const prop = (obj as Record<string, unknown>)[name];
    if (typeof prop === 'object' && prop !== null && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  });

  return Object.freeze(obj);
}

/**
 * Create an immutable copy of an object
 */
export function immutableCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch {
    return obj;
  }
}

/**
 * Safe array update (immutable)
 */
export function safeArrayUpdate<T>(
  array: T[],
  index: number,
  updater: (item: T) => T
): T[] {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return array;
  }

  const newArray = [...array];
  newArray[index] = updater(newArray[index]);
  return newArray;
}

/**
 * Safe object update (immutable)
 */
export function safeObjectUpdate<T extends object>(
  obj: T,
  updates: Partial<T>
): T {
  if (!isValidObject(obj)) {
    return obj;
  }

  return { ...obj, ...updates };
}

// ============= INPUT SANITIZATION =============

/**
 * Sanitize string input
 */
export function sanitizeString(
  value: unknown,
  options: {
    maxLength?: number;
    trim?: boolean;
    toLowerCase?: boolean;
    toUpperCase?: boolean;
  } = {}
): string {
  const { maxLength = 10000, trim = true, toLowerCase = false, toUpperCase = false } = options;

  let str = String(value ?? '');
  
  if (trim) str = str.trim();
  if (toLowerCase) str = str.toLowerCase();
  if (toUpperCase) str = str.toUpperCase();
  if (str.length > maxLength) str = str.substring(0, maxLength);

  return str;
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(
  value: unknown,
  options: {
    min?: number;
    max?: number;
    fallback?: number;
    integer?: boolean;
  } = {}
): number {
  const { min = -Infinity, max = Infinity, fallback = 0, integer = false } = options;

  let num = Number(value);
  
  if (!Number.isFinite(num)) {
    return fallback;
  }

  if (integer) num = Math.round(num);
  if (num < min) num = min;
  if (num > max) num = max;

  return num;
}

/**
 * Sanitize array input
 */
export function sanitizeArray<T>(
  value: unknown,
  options: {
    maxLength?: number;
    fallback?: T[];
    filter?: (item: unknown) => item is T;
  } = {}
): T[] {
  const { maxLength = 10000, fallback = [], filter } = options;

  if (!Array.isArray(value)) {
    return fallback;
  }

  let arr = value;
  
  if (filter) {
    arr = arr.filter(filter);
  }

  if (arr.length > maxLength) {
    arr = arr.slice(0, maxLength);
  }

  return arr as T[];
}

// ============= DEFENSIVE FUNCTION WRAPPERS =============

/**
 * Wrap a function with defensive guards
 */
export function defensiveFunction<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options: {
    fallback: TReturn;
    context?: string;
    validateArgs?: (...args: TArgs) => boolean;
  }
): (...args: TArgs) => TReturn {
  const { fallback, context, validateArgs } = options;

  return (...args: TArgs): TReturn => {
    try {
      // Validate arguments if validator provided
      if (validateArgs && !validateArgs(...args)) {
        logger.warn('Invalid arguments provided', context || 'DefensiveFunction');
        return fallback;
      }

      return fn(...args);
    } catch (error) {
      logger.error('Function execution failed', context || 'DefensiveFunction', error);
      return fallback;
    }
  };
}

/**
 * Wrap an async function with defensive guards
 */
export function defensiveAsyncFunction<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    fallback: TReturn;
    context?: string;
    timeout?: number;
    validateArgs?: (...args: TArgs) => boolean;
  }
): (...args: TArgs) => Promise<TReturn> {
  const { fallback, context, timeout = 30000, validateArgs } = options;

  return async (...args: TArgs): Promise<TReturn> => {
    try {
      // Validate arguments if validator provided
      if (validateArgs && !validateArgs(...args)) {
        logger.warn('Invalid arguments provided', context || 'DefensiveAsyncFunction');
        return fallback;
      }

      // Add timeout protection
      const timeoutPromise = new Promise<TReturn>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeout);
      });

      return await Promise.race([fn(...args), timeoutPromise]);
    } catch (error) {
      logger.error('Async function execution failed', context || 'DefensiveAsyncFunction', error);
      return fallback;
    }
  };
}

// ============= ASSERTION HELPERS =============

/**
 * Assert condition and throw if false (use in development)
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    const error = new Error(`Assertion failed: ${message}`);
    logger.error('Assertion failed', 'DefensiveRuntime', { message });
    
    // In development, throw the error
    if (import.meta.env.DEV) {
      throw error;
    }
  }
}

/**
 * Assert that value is defined
 */
export function assertDefined<T>(
  value: T | undefined | null,
  name: string
): asserts value is T {
  assert(isDefined(value), `${name} must be defined`);
}

/**
 * Ensure value is defined or return fallback
 */
export function ensureDefined<T>(
  value: T | undefined | null,
  fallback: T,
  context?: string
): T {
  if (!isDefined(value)) {
    if (context) {
      logger.debug(`Using fallback for undefined value: ${context}`, 'DefensiveRuntime');
    }
    return fallback;
  }
  return value;
}

// ============= RATE LIMITING =============

interface RateLimitState {
  count: number;
  resetAt: number;
}

const rateLimitStates = new Map<string, RateLimitState>();

/**
 * Check if an operation is rate limited
 */
export function isRateLimited(
  key: string,
  maxOps: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const state = rateLimitStates.get(key);

  if (!state || now > state.resetAt) {
    rateLimitStates.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (state.count >= maxOps) {
    return true;
  }

  state.count++;
  return false;
}

/**
 * Create a rate limited function
 */
export function rateLimitedFunction<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options: {
    key: string;
    maxOps: number;
    windowMs: number;
    fallback: TReturn;
  }
): (...args: TArgs) => TReturn {
  const { key, maxOps, windowMs, fallback } = options;

  return (...args: TArgs): TReturn => {
    if (isRateLimited(key, maxOps, windowMs)) {
      logger.warn(`Rate limit exceeded for: ${key}`, 'DefensiveRuntime');
      return fallback;
    }
    return fn(...args);
  };
}
