import { supabase } from '@/integrations/supabase/client'

const slowQueryThreshold = 2000 // ms

type QueryFn<T> = () => Promise<{ data: T | null; error: Error | null }>

export async function timedQuery<T>(
  label: string,
  queryFn: QueryFn<T>
): Promise<{ data: T | null; error: Error | null; duration: number }> {
  const start = performance.now()
  const result = await queryFn()
  const duration = Math.round(performance.now() - start)

  if (import.meta.env.DEV && duration > slowQueryThreshold) {
    console.warn(`[SlowQuery] ${label}: ${duration}ms (threshold: ${slowQueryThreshold}ms)`)
  }

  return { ...result, duration }
}

export { supabase }
