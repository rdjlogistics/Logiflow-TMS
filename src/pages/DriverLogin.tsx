import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { clearAuthCachesOnly } from '@/lib/authStorage';
import { FloatingTruckMini } from '@/components/driver/FloatingTruckMini';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import {
  Loader2,
  Mail,
  Lock,
  LogIn,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Fingerprint,
} from 'lucide-react';
import { useWebAuthn } from '@/hooks/useWebAuthn';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const DriverLogin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isSupported: biometricSupported, hasCredential: hasBiometric, loading: biometricLoading, authenticate: biometricAuth } = useWebAuthn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const isOnline = navigator.onLine;

  // Already logged in → redirect to portal
  if (!authLoading && user) {
    return <Navigate to="/driver" replace />;
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setError('Geen internetverbinding. Controleer je netwerk en probeer opnieuw.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/driver/reset-password',
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setResetSent(true);
    } catch {
      setError('Er is iets misgegaan. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setError('Geen internetverbinding. Controleer je netwerk en probeer opnieuw.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login')) {
          setError('Ongeldig e-mailadres of wachtwoord.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Je e-mailadres is nog niet bevestigd. Controleer je inbox.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      // AuthProvider's onAuthStateChange will set user → triggers Navigate redirect above
    } catch {
      setError('Er is iets misgegaan. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    try {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      await clearAuthCachesOnly();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen-safe bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a12] flex flex-col items-center justify-center overscroll-contain relative overflow-hidden">
      {/* Animated background orbs */}
      <div
        className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-primary/20 via-pink-500/10 to-transparent blur-3xl pointer-events-none"
      />
      <div
        className="absolute -bottom-60 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-cyan-500/15 via-blue-500/10 to-transparent blur-3xl pointer-events-none"
      />

      {/* Login card */}
      <div
        className="relative z-10 w-full max-w-sm mx-auto px-6"
      >
        {/* Logo / Truck icon */}
        <div className="flex flex-col items-center mb-8">
          <FloatingTruckMini size="lg" />
          <h1
            className="mt-4 text-2xl font-bold text-white/95 tracking-tight"
          >
            Chauffeur Portal
          </h1>
          <p
            className="text-sm text-white/40 mt-1"
          >
            Log in om verder te gaan
          </p>
        </div>

        {/* Offline warning */}
        {!isOnline && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-amber-300 text-sm"
          >
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <span>Geen internetverbinding</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-red-300 text-sm"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Forgot password - reset sent */}
        {forgotPassword && resetSent ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center"
          >
            <Mail className="h-8 w-8 text-emerald-400" />
            <p className="text-emerald-300 text-sm font-medium">
              Check je inbox! We hebben een reset-link naar <span className="font-bold">{email}</span> gestuurd.
            </p>
            <button
              onClick={() => { setForgotPassword(false); setResetSent(false); setError(null); }}
              className="text-xs text-white/40 hover:text-white/60 transition-colors mt-2"
            >
              ← Terug naar inloggen
            </button>
          </div>
        ) : forgotPassword ? (
          /* Forgot password form */
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/60 text-sm">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@bedrijf.nl"
                  required
                  autoComplete="email"
                  className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading || !isOnline}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-white font-semibold text-base shadow-lg shadow-primary/25 transition-all duration-300"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verstuur reset-link'}
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setForgotPassword(false); setError(null); }}
                className="text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                ← Terug naar inloggen
              </button>
            </div>
          </form>
        ) : (
          /* Login form */
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Biometric login button */}
            {biometricSupported && hasBiometric && (
              <div>
                <Button
                  type="button"
                  disabled={biometricLoading || !isOnline}
                  onClick={async () => {
                    setError(null);
                    const success = await biometricAuth();
                    if (!success) {
                      setError('Biometrische verificatie mislukt. Gebruik je wachtwoord.');
                    }
                    // On success, AuthProvider sets user → Navigate redirect fires
                  }}
                  className="w-full h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-base transition-all duration-300 mb-2"
                >
                  {biometricLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Fingerprint className="h-6 w-6 mr-2 text-primary" />
                      Inloggen met Face ID / Touch ID
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/30">of</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/60 text-sm">E-mailadres</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@bedrijf.nl"
                  required
                  autoComplete="email"
                  className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/60 text-sm">Wachtwoord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pl-10 pr-10 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setForgotPassword(true); setError(null); }}
                className="text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                Wachtwoord vergeten?
              </button>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading || !isOnline}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-white font-semibold text-base shadow-lg shadow-primary/25 transition-all duration-300"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Inloggen
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Reset session link */}
        <div className="mt-6 text-center">
          <button
            onClick={handleResetSession}
            className="text-xs text-white/25 hover:text-white/50 transition-colors flex items-center gap-1.5 mx-auto"
          >
            <RefreshCw className="h-3 w-3" />
            Sessie resetten
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;
