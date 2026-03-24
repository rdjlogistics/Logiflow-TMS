import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation, Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthStorage, clearAuthCachesOnly } from "@/lib/authStorage";
import { useAuth } from "@/hooks/useAuth";
import { backendUrl, backendAnonKey } from "@/lib/backendConfig";
import { isBusinessEmail, getBusinessEmailError } from "@/lib/email-validation";
import { generateFingerprint } from "@/lib/browser-fingerprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Truck, Loader2, Sparkles, Zap, Shield, User, Users, LogIn, ChevronDown, ChevronUp, RefreshCw, WifiOff, AlertTriangle } from "lucide-react";

// Demo accounts — credentials via environment only
const DEMO_ACCOUNTS: { email: string; password: string; role: string; icon: typeof User; color: string }[] = [];

// Detailed error message mapping
const getErrorMessage = (error: { message: string }) => {
  const msg = error.message.toLowerCase();
  
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Ongeldige inloggegevens. Controleer je email en wachtwoord.";
  }
  if (msg.includes("email not confirmed")) {
    return "Je email is nog niet bevestigd. Check je inbox.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Te veel pogingen. Wacht even en probeer het opnieuw.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "Netwerkfout. Controleer je internetverbinding en probeer opnieuw.";
  }
  if (msg.includes("refresh") || msg.includes("token")) {
    return "Sessiefout. Klik op 'Reset sessie' en probeer opnieuw.";
  }
  if (msg.includes("already registered") || msg.includes("already exists")) {
    return "Dit emailadres is al geregistreerd. Probeer in te loggen.";
  }
  if (msg.includes("password") && msg.includes("weak")) {
    return "Wachtwoord is te zwak. Gebruik minimaal 6 tekens.";
  }
  
  // Include original message for debugging
  console.warn("Auth error:", error.message);
  return `Er is een fout opgetreden: ${error.message}`;
};

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resettingSession, setResettingSession] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [debugDetails, setDebugDetails] = useState<string | null>(null);
  const [connectivityStatus, setConnectivityStatus] = useState<
    | { state: "idle" }
    | { state: "ok"; message: string }
    | { state: "fail"; message: string }
  >({ state: "idle" });
  const [checkingConnectivity, setCheckingConnectivity] = useState(false);

  const location = useLocation();
  const { toast } = useToast();

  // Check if we're on the demo page
  const isDemoPage = location.pathname === "/demo";

  // ImperialShield has built-in bypasses for auth endpoints, no manual deactivation needed.

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast({
        title: "Verbinding hersteld",
        description: "Je bent weer online. Je kunt nu inloggen.",
      });
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: "Geen internetverbinding",
        description: "Controleer je verbinding en probeer opnieuw.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Reset session function - clears corrupted auth state thoroughly
  const handleResetSession = async () => {
    setResettingSession(true);
    try {
      // Best-effort sign out first (may fail if token is already corrupt)
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }

      // Clear stored auth tokens + cookies (surgical, keeps SW alive)
      await clearAuthCachesOnly();
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      toast({
        title: "Sessie gereset",
        description: "Je sessie + cache zijn opgeschoond. Je kunt nu opnieuw inloggen.",
      });
    } catch (error) {
      console.error("Reset session error:", error);
      toast({
        title: "Reset probleem",
        description: "Vernieuw de pagina handmatig (Ctrl+Shift+R) en probeer opnieuw.",
        variant: "destructive",
      });
    } finally {
      setResettingSession(false);
      // Hard reload to ensure a fresh boot.
      window.location.href = window.location.pathname;
    }
  };

  const handleConnectivityCheck = async () => {
    setCheckingConnectivity(true);
    setConnectivityStatus({ state: "idle" });
    setDebugDetails(null);

    try {
      const baseUrl = backendUrl;
      const apikey = backendAnonKey;

      if (!baseUrl || !apikey) {
        setConnectivityStatus({
          state: "fail",
          message: "Backend configuratie ontbreekt (URL/key).",
        });
        return;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);

      // We only need to know if the backend is reachable. 401 is fine.
      const res = await fetch(`${baseUrl}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey,
          Authorization: `Bearer ${apikey}`,
        },
        signal: controller.signal,
      });

      window.clearTimeout(timeout);

      setConnectivityStatus({
        state: "ok",
        message: `Backend bereikbaar (HTTP ${res.status}).`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setConnectivityStatus({ state: "fail", message: `Niet bereikbaar: ${msg}` });
      setDebugDetails(`Connectivity check failed\n- navigator.onLine: ${navigator.onLine}\n- error: ${msg}`);
    } finally {
      setCheckingConnectivity(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setInlineError(null);
    setDebugDetails(null);

    try {
      console.log('[Auth] Demo login attempt:', { email: demoEmail, timestamp: new Date().toISOString() });

      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      console.log('[Auth] Demo login response:', { error: error?.message, success: !error });

      if (error) {
        const message = getErrorMessage(error);
        setInlineError(message);
        setDebugDetails(
          `Demo login error\n- navigator.onLine: ${navigator.onLine}\n- message: ${error.message}`
        );
        toast({
          title: "Demo login mislukt",
          description: message,
          variant: "destructive",
        });
      } else {
        setInlineError(null);
        setDebugDetails(null);
        // AuthProvider's onAuthStateChange will set user → triggers Navigate redirect
      }
    } catch (unexpectedError) {
      const msg = unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError);
      console.error('[Auth] Unexpected demo login error:', unexpectedError);
      setInlineError("Onverwachte fout. Zie debug details hieronder.");
      setDebugDetails(`Unexpected demo login error\n- navigator.onLine: ${navigator.onLine}\n- message: ${msg}`);
      toast({
        title: "Onverwachte fout",
        description: "Er is iets misgegaan. Vernieuw de pagina en probeer opnieuw.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

   // Already logged in → redirect to dashboard (DashboardLayout handles onboarding redirect)
  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    setDebugDetails(null);

    if (!email || !password) {
      setInlineError("Email en wachtwoord zijn verplicht.");
      toast({
        title: "Vul alle velden in",
        description: "Email en wachtwoord zijn verplicht.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('[Auth] Login attempt:', { email, timestamp: new Date().toISOString() });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[Auth] Login response:', { error: error?.message, success: !error });

      if (error) {
        const message = getErrorMessage(error);
        setInlineError(message);
        setDebugDetails(
          `Login error\n- navigator.onLine: ${navigator.onLine}\n- message: ${error.message}`
        );
        toast({
          title: "Inloggen mislukt",
          description: message,
          variant: "destructive",
        });
      } else {
        setInlineError(null);
        setDebugDetails(null);
        // AuthProvider's onAuthStateChange will set user → triggers Navigate redirect
      }
    } catch (unexpectedError) {
      const msg = unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError);
      console.error('[Auth] Unexpected login error:', unexpectedError);
      setInlineError("Onverwachte fout. Zie debug details hieronder.");
      setDebugDetails(`Unexpected login error\n- navigator.onLine: ${navigator.onLine}\n- message: ${msg}`);
      toast({
        title: "Onverwachte fout",
        description: "Er is iets misgegaan. Vernieuw de pagina en probeer opnieuw.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !fullName) {
      toast({
        title: "Vul alle velden in",
        description: "Naam, email en wachtwoord zijn verplicht.",
        variant: "destructive",
      });
      return;
    }

    if (!acceptTerms) {
      toast({
        title: "Voorwaarden accepteren",
        description: "U moet akkoord gaan met de algemene voorwaarden en het privacybeleid.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Wachtwoord te kort",
        description: "Je wachtwoord moet minimaal 6 tekens bevatten.",
        variant: "destructive",
      });
      return;
    }

    // Business email check
    if (!isBusinessEmail(email)) {
      setInlineError(getBusinessEmailError());
      toast({
        title: "Zakelijk e-mailadres vereist",
        description: getBusinessEmailError(),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setInlineError(null);

    // Generate browser fingerprint for fraud detection
    let fingerprint = '';
    try {
      fingerprint = await generateFingerprint();
    } catch {
      // Non-fatal
    }

    const planSlug = searchParams.get('plan') || '';
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          ...(planSlug ? { selected_plan: planSlug } : {}),
          ...(fingerprint ? { browser_fingerprint: fingerprint } : {}),
        },
      },
    });

    if (!error && planSlug) {
      localStorage.setItem('pending_plan', planSlug);
    }

    if (error) {
      const message = getErrorMessage(error);
      setInlineError(message);
      toast({
        title: "Registratie mislukt",
        description: message,
        variant: "destructive",
      });
    } else {
      // Ensure profile + role exist (fallback for missing DB trigger)
      if (signUpData?.user) {
        try {
          const { ensureProfileAfterSignup } = await import('@/lib/ensureProfileAfterSignup');
          await ensureProfileAfterSignup(signUpData.user.id, email, fullName);
        } catch (e) {
          console.error('[Auth] ensureProfileAfterSignup failed:', e);
        }
      }
      setInlineError(null);
      toast({
        title: "Account aangemaakt!",
        description: "Controleer je inbox om je e-mailadres te bevestigen.",
      });
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background mesh-bg">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="floating-orb w-96 h-96 -top-48 -left-48"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="floating-orb w-72 h-72 top-1/2 -right-36 bg-accent/20"
            style={{ animationDelay: "2s" }}
          />
        </div>
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse-glow">
            <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background mesh-bg p-4">
      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground py-3 px-4 shadow-lg animate-fade-in">
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div className="text-center">
              <p className="font-medium text-sm">Geen internetverbinding</p>
              <p className="text-xs opacity-90">Controleer je verbinding om in te loggen</p>
            </div>
          </div>
        </div>
      )}

      {/* Animated background orbs - opacity-0 initially to prevent CLS, then fade in */}
      <div 
        className="fixed inset-0 overflow-hidden pointer-events-none opacity-0 animate-[fade-in_0.5s_ease-out_0.1s_forwards]"
        style={{ contain: 'strict', willChange: 'opacity' }}
      >
        <div
          className="floating-orb w-[500px] h-[500px] -top-64 -left-64"
          style={{ animationDelay: "0s", animationDuration: "8s" }}
        />
        <div
          className="floating-orb w-[400px] h-[400px] top-1/3 -right-48 bg-accent/15"
          style={{ animationDelay: "2s", animationDuration: "10s" }}
        />
        <div
          className="floating-orb w-[300px] h-[300px] -bottom-32 left-1/4 bg-primary/10"
          style={{ animationDelay: "4s", animationDuration: "12s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center min-h-[520px] lg:min-h-[555px]">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col space-y-8 p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                  <Truck className="h-8 w-8 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="h-3 w-3 text-accent-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight gradient-text">
                  LogiFlow
                </h1>
                <p className="text-muted-foreground font-medium">
                  Premium Logistiek Platform
                </p>
              </div>
            </div>

            <p className="text-xl text-foreground/80 leading-relaxed">
              Het meest geavanceerde logistiek management systeem voor moderne
              transportbedrijven.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              {
                icon: Zap,
                title: "Razendsnelle operaties",
                desc: "Real-time tracking en automatische facturatie",
              },
              {
                icon: Shield,
                title: "Veilig & betrouwbaar",
                desc: "Enterprise-grade beveiliging voor je data",
              },
              {
                icon: Sparkles,
                title: "Premium ervaring",
                desc: "Intuïtieve interface met moderne UX",
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/30 animate-fade-in"
                style={{ animationDelay: `${(index + 1) * 200}ms` }}
              >
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Auth form */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}
          className="w-full max-w-md mx-auto"
        >
        <Card variant="glass" className="w-full">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="lg:hidden flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                  <Truck className="h-8 w-8 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="h-3 w-3 text-accent-foreground" />
                </div>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold lg:hidden">
                LogiFlow
              </CardTitle>
              <CardTitle className="text-2xl font-bold hidden lg:block">
                Welkom terug
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Log in of maak een nieuw account aan
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/50">
                <TabsTrigger
                  value="login"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Inloggen
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Registreren
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="naam@bedrijf.nl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="login-password"
                      className="text-sm font-medium"
                    >
                      Wachtwoord
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary"
                    />
                    <div className="flex justify-end mt-1">
                      <Link
                        to="/reset-password"
                        className="text-xs text-primary hover:underline"
                      >
                        Wachtwoord vergeten?
                      </Link>
                    </div>
                    </div>

                  {/* Inline Error Display */}
                  {inlineError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{inlineError}</span>
                      </div>
                    </div>
                  )}

                  {debugDetails && (
                    <details className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                      <summary className="cursor-pointer select-none">Debug details</summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words">{debugDetails}</pre>
                    </details>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity font-semibold"
                    disabled={loading || isOffline}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Inloggen...
                      </>
                    ) : isOffline ? (
                      <>
                        <WifiOff className="mr-2 h-4 w-4" />
                        Offline - kan niet inloggen
                      </>
                    ) : (
                      "Inloggen"
                    )}
                  </Button>

                  {/* Session Reset Button */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleResetSession}
                      disabled={resettingSession}
                      className="flex items-center justify-center gap-2 w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {resettingSession ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      <span>Problemen met inloggen? Reset sessie</span>
                    </button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleConnectivityCheck}
                      disabled={checkingConnectivity}
                      className="w-full h-10 rounded-xl"
                    >
                      {checkingConnectivity ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verbinding testen...
                        </>
                      ) : (
                        "Test backend verbinding"
                      )}
                    </Button>

                    {connectivityStatus.state !== "idle" && (
                      <div className="text-xs text-muted-foreground">
                        {connectivityStatus.state === "ok" ? (
                          <span>{connectivityStatus.message}</span>
                        ) : (
                          <span className="text-destructive">{connectivityStatus.message}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Demo Accounts Section - Only on /demo route */}
                  {isDemoPage && (
                    <div className="pt-4 border-t border-border/50">
                      <button
                        type="button"
                        onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                        className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Demo Accounts
                        </span>
                        {showDemoAccounts ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      
                      {showDemoAccounts && (
                        <div className="mt-3 space-y-2">
                          {DEMO_ACCOUNTS.map((account) => (
                            <button
                              key={account.email}
                              type="button"
                              onClick={() => handleDemoLogin(account.email, account.password)}
                              disabled={loading || isOffline}
                              className="flex items-center gap-3 w-full p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className={`w-8 h-8 rounded-lg ${account.color} flex items-center justify-center`}>
                                <account.icon className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{account.email}</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {account.role}
                                  </Badge>
                                </div>
                              </div>
                              <LogIn className="h-4 w-4 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Link to demo page from normal auth */}
                  {!isDemoPage && (
                    <div className="pt-4 border-t border-border/50">
                      <Link 
                        to="/demo"
                        className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-sm"
                      >
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>Demo bekijken</span>
                      </Link>
                    </div>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium">
                      Volledige naam
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Jan Jansen"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signup-email"
                      className="text-sm font-medium"
                    >
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="naam@bedrijf.nl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="signup-password"
                      className="text-sm font-medium"
                    >
                      Wachtwoord
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Minimaal 6 tekens"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                    <Checkbox
                      id="terms-acceptance"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                    />
                    <label 
                      htmlFor="terms-acceptance" 
                      className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      Ik ga akkoord met de{' '}
                      <a href="/legal/terms" target="_blank" className="text-primary hover:underline">
                        Algemene Voorwaarden
                      </a>
                      {' '}en het{' '}
                      <a href="/legal/privacy" target="_blank" className="text-primary hover:underline">
                        Privacybeleid
                      </a>
                      . *
                    </label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Account aanmaken...
                      </>
                    ) : (
                      "Account aanmaken"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
