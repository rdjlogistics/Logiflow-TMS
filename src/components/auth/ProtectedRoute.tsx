import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthStorage, clearAuthCachesOnly } from "@/lib/authStorage";
import { Loader2, AlertTriangle, RefreshCw, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppRole = "admin" | "medewerker" | "chauffeur" | "klant";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, redirectTo = "/auth", allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, authStalled, authReady } = useAuth();
  const { role, loading: roleLoading, refetch, error: roleError } = usePermissions();
  const location = useLocation();
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_AUTO_RETRIES = 2;

  // Auto-retry when role is null but user is authenticated, auth is ready, and we have allowedRoles
  useEffect(() => {
    if (
      user &&
      authReady &&
      !loading &&
      !roleLoading &&
      role === null &&
      allowedRoles &&
      allowedRoles.length > 0 &&
      retryCount < MAX_AUTO_RETRIES
    ) {
      retryTimerRef.current = setTimeout(() => {
        console.warn(`[ProtectedRoute] Role is null, auto-retry ${retryCount + 1}/${MAX_AUTO_RETRIES}`);
        setRetryCount(prev => prev + 1);
        refetch();
      }, 2000);
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [user, authReady, loading, roleLoading, role, allowedRoles, retryCount, refetch]);

  // Reset retry count when role is loaded
  useEffect(() => {
    if (role !== null) {
      setRetryCount(0);
    }
  }, [role]);

  const handleResetSession = async () => {
    try {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      await clearAuthCachesOnly();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      window.location.href = "/auth";
    } catch (error) {
      console.error("Reset session error:", error);
      window.location.reload();
    }
  };

  const handleReload = () => window.location.reload();

  // Auth stalled
  if (authStalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 max-w-md text-center p-6">
          <div className="w-16 h-16 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Sessiestart duurt te lang</h2>
            <p className="text-muted-foreground text-sm">
              De authenticatie duurt langer dan verwacht. Dit kan komen door een trage verbinding of een probleem met je sessie.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button variant="outline" onClick={handleReload} className="flex-1 gap-2">
              <RefreshCw className="h-4 w-4" />
              Herlaad pagina
            </Button>
            <Button variant="destructive" onClick={handleResetSession} className="flex-1 gap-2">
              <AlertTriangle className="h-4 w-4" />
              Reset sessie
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Probeer eerst "Herlaad pagina". Als dat niet werkt, kies "Reset sessie" om opnieuw in te loggen.
          </p>
        </div>
      </div>
    );
  }

  // Auth loading or not yet ready
  if (loading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Laden...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role-based restriction
  if (allowedRoles && allowedRoles.length > 0) {
    // Still loading role OR auto-retrying
    if (roleLoading || (role === null && retryCount < MAX_AUTO_RETRIES)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Rechten controleren...</p>
          </div>
        </div>
      );
    }

    // Role loaded but not in allowed list
    if (role && !allowedRoles.includes(role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-6 max-w-md text-center p-6">
            <div className="w-16 h-16 rounded-xl bg-destructive/10 flex items-center justify-center">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Geen toegang</h2>
              <p className="text-muted-foreground text-sm">
                Je hebt geen toestemming om deze pagina te bekijken.
                Neem contact op met je beheerder als je denkt dat dit een fout is.
              </p>
            </div>
            <Button asChild variant="outline">
              <a href="/">Terug naar dashboard</a>
            </Button>
          </div>
        </div>
      );
    }

    // Role is null after all retries — show recovery UI with manual retry
    if (!role) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-6 max-w-md text-center p-6">
            <div className="w-16 h-16 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Rol niet gevonden</h2>
              <p className="text-muted-foreground text-sm">
                Er is een tijdelijk probleem bij het ophalen van je rechten.
                Probeer het opnieuw of neem contact op met je beheerder.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                variant="default"
                onClick={() => {
                  setRetryCount(0);
                  refetch();
                }}
                className="flex-1 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Opnieuw proberen
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href="/">Terug naar dashboard</a>
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
