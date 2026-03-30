import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Ensures a profile, role, and company exist for a newly signed-up user.
 * This is a fallback for the database trigger `on_auth_user_created`
 * and the `ensure-user-company` edge function.
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

  // 3. Ensure company + user_companies link exists (client-side fallback)
  try {
    const { data: existingLink } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!existingLink) {
      // Derive a company name
      const normalizedEmail = email.trim().toLowerCase();
      const domain = normalizedEmail.split("@")[1] || "";
      const genericDomains = [
        "gmail.com", "hotmail.com", "outlook.com", "yahoo.com",
        "live.nl", "ziggo.nl", "kpnmail.nl", "icloud.com",
      ];
      let companyName = "Mijn Bedrijf";
      if (domain && !genericDomains.includes(domain)) {
        const domainBase = domain.split(".")[0];
        companyName = domainBase.charAt(0).toUpperCase() + domainBase.slice(1);
      } else if (fullName) {
        companyName = `${fullName}'s Bedrijf`;
      }

      // Create company
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          email: normalizedEmail,
          country: "Nederland",
          is_active: true,
          settings: {},
        })
        .select("id")
        .single();

      if (companyError) {
        console.error("[ensureProfile] Company creation failed:", companyError);
        return;
      }

      // Link user to company
      const { error: linkError } = await supabase
        .from("user_companies")
        .insert({
          user_id: userId,
          company_id: newCompany.id,
          is_primary: true,
        });

      if (linkError) {
        console.error("[ensureProfile] user_companies link failed:", linkError);
        return;
      }

      // Create tenant_settings so onboarding triggers
      const { error: settingsError } = await supabase
        .from("tenant_settings")
        .insert({
          company_id: newCompany.id,
          onboarding_completed_at: null,
        } as any);

      if (settingsError) {
        console.warn("[ensureProfile] tenant_settings insert warning:", settingsError.message);
      }

      logger.info(`[ensureProfile] Created company ${newCompany.id} for user ${userId}`);
    }
  } catch (err) {
    console.error("[ensureProfile] Company ensure failed:", err);
  }
}
