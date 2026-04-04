import { Truck, MapPin, Navigation, Sparkles, Star } from 'lucide-react';

export const FloatingTruck3D = () => {
  return (
    <div className="relative w-full h-80 flex items-center justify-center">
      {/* Background glow */}
      <div className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-primary/30 via-pink-500/20 to-purple-600/30 blur-3xl animate-pulse" />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-bounce"
          style={{
            left: `${20 + i * 12}%`,
            top: `${30 + (i % 3) * 20}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${3 + i * 0.5}s`,
          }}
        >
          {i % 3 === 0 ? (
            <Star className="w-3 h-3 text-primary fill-primary" />
          ) : i % 3 === 1 ? (
            <Sparkles className="w-4 h-4 text-pink-400" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-pink-500" />
          )}
        </div>
      ))}

      {/* Main truck container */}
      <div className="relative z-10 animate-float">
        {/* Truck shadow */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/30 rounded-full blur-xl animate-pulse" />

        {/* Truck icon with glassmorphism */}
        <div
          className="relative p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl hover:scale-105 transition-transform duration-300"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px -15px hsl(var(--primary) / 0.3)',
          }}
        >
          <Truck className="w-24 h-24 text-primary" strokeWidth={1.5} />

          {/* Route dots */}
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 animate-pulse">
            <Navigation className="w-6 h-6 text-pink-500 rotate-45" />
          </div>
          <div className="absolute -left-4 top-1/4 animate-bounce" style={{ animationDuration: '2.5s' }}>
            <MapPin className="w-5 h-5 text-emerald-400 fill-emerald-400/30" />
          </div>
        </div>
      </div>

      {/* Speed lines */}
      <div className="absolute left-10 top-1/2 -translate-y-1/2 space-y-3 animate-pulse" style={{ animationDuration: '2s' }}>
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
        <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent rounded-full ml-4" />
        <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full" />
      </div>
    </div>
  );
};
