export const logger = {
  log: (...args: unknown[]) => { if (import.meta.env.DEV) console.log(...args) },
  info: (...args: unknown[]) => { if (import.meta.env.DEV) console.info(...args) },
  debug: (...args: unknown[]) => { if (import.meta.env.DEV) console.debug(...args) },
  warn: (...args: unknown[]) => { if (import.meta.env.DEV) console.warn(...args) },
  error: (...args: unknown[]) => console.error(...args), // always show
}
