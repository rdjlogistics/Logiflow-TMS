import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FloatingTruckMini } from '@/components/driver/FloatingTruckMini';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

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

const DriverResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Listen for the recovery session from the email link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (user clicked link and session was set)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens bevatten.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate('/driver/login', { replace: true }), 2500);
    } catch {
      setError('Er is iets misgegaan. Probeer het opnieuw.');
    } finally {
      setLoading(false);
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

      <div
        className="relative z-10 w-full max-w-sm mx-auto px-6"
      >
        <div className="flex flex-col items-center mb-8">
          <FloatingTruckMini size="lg" />
          <h1 className="mt-4 text-2xl font-bold text-white/95 tracking-tight">
            Nieuw wachtwoord
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Stel een nieuw wachtwoord in
          </p>
        </div>

        {success ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-6 text-center"
          >
            <CheckCircle className="h-8 w-8 text-emerald-400" />
            <p className="text-emerald-300 text-sm font-medium">
              Wachtwoord succesvol gewijzigd! Je wordt doorgestuurd naar de login pagina…
            </p>
          </div>
        ) : !sessionReady ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-6 text-center">
            <Loader2 className="h-6 w-6 text-white/40 animate-spin" />
            <p className="text-white/40 text-sm">Sessie laden… Klik op de link in je e-mail om door te gaan.</p>
          </div>
        ) : (
          <>
            {error && (
              <div
                className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-red-300 text-sm"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-white/60 text-sm">Nieuw wachtwoord</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
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

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-white/60 text-sm">Bevestig wachtwoord</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="pl-10 pr-10 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-white font-semibold text-base shadow-lg shadow-primary/25 transition-all duration-300"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Wachtwoord opslaan'}
                </Button>
              </div>
            </form>
          </>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/driver/login')}
            className="text-xs text-white/25 hover:text-white/50 transition-colors"
          >
            ← Terug naar inloggen
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverResetPassword;
