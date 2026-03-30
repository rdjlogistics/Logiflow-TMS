import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PortalGuardProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

const PortalGuard = ({ children, skipOnboardingCheck = false }: PortalGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setHasAccess(false);
      setNeedsOnboarding(false);
      return;
    }

    const check = async () => {
      // 1. Role check
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["klant", "admin", "medewerker"])
        .limit(1)
        .maybeSingle();

      if (!roleData) {
        setHasAccess(false);
        setNeedsOnboarding(false);
        return;
      }

      setHasAccess(true);

      // 2. Onboarding check — only for klant role, skip on onboarding page itself
      if (skipOnboardingCheck) {
        setNeedsOnboarding(false);
        return;
      }

      // Only check onboarding for klant users
      const isKlant = roleData.role === "klant";
      if (!isKlant) {
        setNeedsOnboarding(false);
        return;
      }

      const { data: prefs } = await supabase
        .from("portal_notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setNeedsOnboarding(!prefs);
    };

    check();
  }, [user, authLoading, skipOnboardingCheck]);

  if (authLoading || hasAccess === null || (hasAccess && needsOnboarding === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  if (needsOnboarding && location.pathname.startsWith("/portal/b2b") && location.pathname !== "/portal/b2b/onboarding") {
    return <Navigate to="/portal/b2b/onboarding" replace />;
  }

  return <>{children}</>;
};

export default PortalGuard;
