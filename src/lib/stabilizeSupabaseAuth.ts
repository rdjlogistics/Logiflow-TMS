import type { SupabaseClient } from "@supabase/supabase-js";

let authLockStabilized = false;

type AuthClientWithLock = {
  lock?: <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R>;
};

export function stabilizeSupabaseAuthClient(client: SupabaseClient) {
  if (authLockStabilized || typeof window === "undefined") return;

  const auth = (client as unknown as { auth?: AuthClientWithLock }).auth;
  if (!auth || typeof auth !== "object") return;

  auth.lock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => {
    return await fn();
  };

  authLockStabilized = true;
}
