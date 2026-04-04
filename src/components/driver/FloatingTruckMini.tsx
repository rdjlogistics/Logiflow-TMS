import { Truck, Sparkles, Star } from 'lucide-react';

interface FloatingTruckMiniProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FloatingTruckMini = ({ size = 'md', className = '' }: FloatingTruckMiniProps) => {
  const sizes = {
    sm: { container: 'w-16 h-16', icon: 'w-8 h-8', particles: 3 },
    md: { container: 'w-20 h-20', icon: 'w-10 h-10', particles: 4 },
    lg: { container: 'w-24 h-24', icon: 'w-12 h-12', particles: 5 },
  };

  const sizeConfig = sizes[size];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background glow */}
      <div
        className="absolute w-full h-full rounded-full bg-gradient-to-br from-primary/30 via-pink-500/20 to-purple-600/30 blur-xl"
      />

      {/* Floating particles */}
      {[...Array(sizeConfig.particles)].map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${15 + i * 18}%`,
            top: `${20 + (i % 2) * 25}%`,
          }}
        >
          {i % 2 === 0 ? (
            <Star className="w-2 h-2 text-primary fill-primary" />
          ) : (
            <Sparkles className="w-2 h-2 text-pink-400" />
          )}
        </div>
      ))}

      {/* Main truck container */}
      <div
        className="relative z-10"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Truck shadow */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-black/20 rounded-full blur-md"
        />

        {/* Truck icon with glassmorphism */}
        <div
          className={`${sizeConfig.container} rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center`}
          style={{
            boxShadow: '0 15px 30px -10px rgba(0, 0, 0, 0.4), 0 0 40px -10px hsl(var(--primary) / 0.25)',
          }}
        >
          <div
          >
            <Truck className={`${sizeConfig.icon} text-primary`} strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
};