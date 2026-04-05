import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePortalAccess } from "@/hooks/usePortalAccess";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortalGuardProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

const PortalGuard = ({ children, skipOnboardingCheck = false }: PortalGuardProps) => {
  const { user, loading: authLoading, authReady } = useAuth();
  const { hasPortalAccess, needsOnboarding, loading: accessLoading, error, refetch } = usePortalAccess();
  const location = useLocation();

  // Still bootstrapping auth
  if (authLoading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }

  // Still checking portal access
  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Query error — show retry UI, don't kick user out
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center p-6">
          <AlertTriangle className="h-8 w-8 text-warning" />
          <p className="text-sm text-muted-foreground">
            Er is een tijdelijk probleem bij het controleren van je toegang. Probeer het opnieuw.
          </p>
          <Button variant="default" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Opnieuw proberen
          </Button>
        </div>
      </div>
    );
  }

  // Definitively no access
  if (!hasPortalAccess) {
    return <Navigate to="/" replace />;
  }

  // Onboarding redirect (only for klant, skip on onboarding page itself)
  if (
    !skipOnboardingCheck &&
    needsOnboarding &&
    location.pathname.startsWith("/portal/b2b") &&
    location.pathname !== "/portal/b2b/onboarding"
  ) {
    return <Navigate to="/portal/b2b/onboarding" replace />;
  }

  return <>{children}</>;
};

export default PortalGuard;
