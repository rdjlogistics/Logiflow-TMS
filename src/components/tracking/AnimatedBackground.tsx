import { useParallaxEffect } from '@/hooks/useParallaxEffect';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  variant?: 'tracking' | 'delivery' | 'default';
  className?: string;
}

export const AnimatedBackground = ({ variant = 'default', className }: AnimatedBackgroundProps) => {
  const { mousePosition, scrollPosition } = useParallaxEffect();

  const getVariantElements = () => {
    switch (variant) {
      case 'tracking':
        return (
          <>
            {/* Animated route lines */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Moving route particles */}
              {[...Array(5)].map((_, i) => (
                <div
                  key={`route-${i}`}
                  className="absolute w-2 h-2 rounded-full bg-primary/30"
                  style={{
                    left: `${10 + i * 20}%`,
                    top: `${30 + Math.sin(i) * 20}%`,
                    transform: `translate3d(${mousePosition.normalizedX * 30 * (i + 1)}px, ${
                      mousePosition.normalizedY * 20 * (i + 1) + scrollPosition.scrollY * 0.1 * (i + 1)
                    }px, 0)`,
                    animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}

              {/* Gradient orbs */}
              <div
                className="absolute w-96 h-96 rounded-full bg-gradient-radial from-primary/10 via-primary/5 to-transparent blur-3xl"
                style={{
                  top: '-10%',
                  right: '-10%',
                  transform: `translate3d(${mousePosition.normalizedX * -40}px, ${
                    mousePosition.normalizedY * -40 + scrollPosition.scrollY * 0.05
                  }px, 0)`,
                }}
              />
              <div
                className="absolute w-72 h-72 rounded-full bg-gradient-radial from-accent/15 via-accent/5 to-transparent blur-3xl"
                style={{
                  bottom: '10%',
                  left: '-5%',
                  transform: `translate3d(${mousePosition.normalizedX * 30}px, ${
                    mousePosition.normalizedY * 30 - scrollPosition.scrollY * 0.03
                  }px, 0)`,
                }}
              />

              {/* Animated dashed route line */}
              <svg
                className="absolute inset-0 w-full h-full"
                style={{
                  transform: `translate3d(${mousePosition.normalizedX * 10}px, ${mousePosition.normalizedY * 10}px, 0)`,
                }}
              >
                <defs>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <path
                  d="M-50,100 Q200,50 400,150 T800,100"
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="2"
                  strokeDasharray="10,10"
                  className="animate-dash"
                />
              </svg>
            </div>

            {/* Floating truck icon silhouette */}
            <div
              className="absolute opacity-5"
              style={{
                top: '20%',
                right: '15%',
                transform: `translate3d(${mousePosition.normalizedX * 50}px, ${
                  mousePosition.normalizedY * 30 - scrollPosition.scrollY * 0.08
                }px, 0) rotate(${mousePosition.normalizedX * 5}deg)`,
              }}
            >
              <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9 1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            </div>

            {/* Location pin silhouette */}
            <div
              className="absolute opacity-5"
              style={{
                bottom: '25%',
                left: '10%',
                transform: `translate3d(${mousePosition.normalizedX * -30}px, ${
                  mousePosition.normalizedY * 40 + scrollPosition.scrollY * 0.05
                }px, 0)`,
              }}
            >
              <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          </>
        );
      case 'delivery':
        return (
          <>
            {/* Package-themed floating elements */}
            {[...Array(8)].map((_, i) => (
              <div
                key={`package-${i}`}
                className="absolute w-3 h-3 rounded-sm bg-primary/20 rotate-45"
                style={{
                  left: `${5 + i * 12}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  transform: `translate3d(${mousePosition.normalizedX * 20 * (i % 3 + 1)}px, ${
                    mousePosition.normalizedY * 15 * (i % 2 + 1)
                  }px, 0) rotate(${45 + mousePosition.normalizedX * 10}deg)`,
                  opacity: 0.1 + (i % 3) * 0.1,
                }}
              />
            ))}

            {/* Gradient wave */}
            <div
              className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-primary/5 to-transparent"
              style={{
                transform: `translateY(${scrollPosition.scrollY * 0.1}px)`,
              }}
            />
          </>
        );
      default:
        return (
          <>
            {/* Simple gradient orbs */}
            <div
              className="absolute w-64 h-64 rounded-full bg-gradient-radial from-primary/10 to-transparent blur-3xl"
              style={{
                top: '10%',
                right: '20%',
                transform: `translate3d(${mousePosition.normalizedX * -20}px, ${mousePosition.normalizedY * -20}px, 0)`,
              }}
            />
            <div
              className="absolute w-48 h-48 rounded-full bg-gradient-radial from-accent/10 to-transparent blur-3xl"
              style={{
                bottom: '20%',
                left: '10%',
                transform: `translate3d(${mousePosition.normalizedX * 20}px, ${mousePosition.normalizedY * 20}px, 0)`,
              }}
            />
          </>
        );
    }
  };

  return (
    <div 
      className={cn('fixed inset-0 overflow-hidden pointer-events-none', className)}
      style={{ 
        contain: 'strict',
        contentVisibility: 'auto',
        containIntrinsicSize: '100vw 100vh',
        willChange: 'transform',
        zIndex: -1,
      }}
      aria-hidden="true"
    >
      {getVariantElements()}
    </div>
  );
};
