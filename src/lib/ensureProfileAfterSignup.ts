import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures a profile and role exist for a newly signed-up user.
 * This is a fallback for the database trigger `on_auth_user_created`
 * which cannot be reliably created on `auth.users` in hosted Supabase.
 */
export async function ensureProfileAfterSignup(
  userId: string,
  email: string,
  fullName: string | null,
  options?: { skipAdminRole?: boolean }
) {
  // 1. Upsert profile
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        email: email.trim().toLowerCase(),
        full_name: fullName || null,
      },
      { onConflict: "user_id" }
    );

  if (profileError) {
    console.error("[ensureProfile] Profile upsert failed:", profileError);
  }

  // 2. Insert role (admin for self-service, skip for invited/driver users)
  if (!options?.skipAdminRole) {
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "admin" as const },
        { onConflict: "user_id,role" }
      );

    if (roleError) {
      console.error("[ensureProfile] Role upsert failed:", roleError);
    }
  }
}
