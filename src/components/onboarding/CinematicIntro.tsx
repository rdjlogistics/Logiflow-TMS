import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Building2, Package, Bot, LayoutDashboard, Clock } from 'lucide-react';

interface CinematicIntroProps {
  userName: string;
  onContinue: () => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return 'Goedenacht';
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
};

const TIMELINE_ITEMS = [
  { icon: Building2, label: 'Bedrijf verifiëren', color: 'from-blue-500 to-cyan-500' },
  { icon: Package, label: 'TMS plan kiezen', color: 'from-emerald-500 to-teal-500' },
  { icon: Bot, label: 'AI Co-pilot', color: 'from-violet-500 to-purple-500' },
  { icon: LayoutDashboard, label: 'Dashboard inrichten', color: 'from-amber-500 to-orange-500' },
];

export const CinematicIntro = ({ userName, onContinue }: CinematicIntroProps) => {
  const [phase, setPhase] = useState(0); // 0=hello, 1=greeting, 2=content
  const greeting = getGreeting();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] sm:min-h-[60vh] py-8 relative">
      <AnimatePresence mode="wait">
        {/* Phase 0: Large "Hallo" text */}
        {phase === 0 && (
          <motion.div
            key="hello"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="text-center"
          >
            <h1 className="text-6xl sm:text-8xl lg:text-9xl font-display font-bold tracking-tighter bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
              Hallo
            </h1>
          </motion.div>
        )}

        {/* Phase 1: Personalized greeting */}
        {phase === 1 && (
          <motion.div
            key="greeting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 150, damping: 25 }}
            className="text-center space-y-3"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-light tracking-tight">
              {greeting},{' '}
              <span className="font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {userName}
              </span>
            </h1>
          </motion.div>
        )}

        {/* Phase 2: Full content */}
        {phase === 2 && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-10 w-full max-w-md mx-auto px-4"
          >
            {/* 3D Truck Icon */}
            <motion.div
              initial={{ scale: 0, rotateY: -30 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-[28px] bg-gradient-to-br from-primary via-primary/80 to-primary/50 shadow-2xl shadow-primary/30"
              style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
            >
              <Truck className="h-12 w-12 text-primary-foreground drop-shadow-lg" />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="space-y-2"
            >
              <h2 className="text-2xl sm:text-3xl font-display font-light tracking-tight">
                Welkom bij <span className="font-semibold">LogiFlow</span>
              </h2>
              <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                Laten we je hele TMS in een paar minuten inrichten.
              </p>
            </motion.div>

            {/* Duration badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground/70 font-medium">Duurt ~3 minuten</span>
            </motion.div>

            {/* Timeline dots */}
            <div className="space-y-2.5">
              {TIMELINE_ITEMS.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08, type: 'spring', stiffness: 250, damping: 25 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl text-left backdrop-blur-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.06] transition-colors"
                >
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-lg`}>
                    <item.icon className="h-4.5 w-4.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground/80">{item.label}</span>
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onClick={onContinue}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            >
              Aan de slag
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
