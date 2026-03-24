import { backendUrl, backendAnonKey } from './backendConfig';

export const env = {
  supabaseUrl: backendUrl,
  supabaseAnonKey: backendAnonKey,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

