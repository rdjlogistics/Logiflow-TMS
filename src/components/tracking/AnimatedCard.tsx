import { ReactNode, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useParallaxEffect';

interface AnimatedCardProps {
  children: ReactNode;
  title?: ReactNode;
  icon?: ReactNode;
  className?: string;
  delay?: number;
  enableHover?: boolean;
  variant?: 'default' | 'glow' | 'glass';
}

export const AnimatedCard = ({
  children,
  title,
  icon,
  className,
  delay = 0,
  enableHover = true,
  variant = 'default',
}: AnimatedCardProps) => {
  const { ref, isVisible } = useScrollReveal(0.1);
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !enableHover) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const variantClasses = {
    default: '',
    glow: 'shadow-glow hover:shadow-glow-accent',
    glass: 'bg-background/60 backdrop-blur-xl border-border/50',
  };

  return (
    <div ref={ref} className="perspective-1000">
      <Card
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setMousePos({ x: 0, y: 0 });
        }}
        className={cn(
          'transition-all duration-500 ease-out',
          variantClasses[variant],
          isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8',
          enableHover && 'hover:shadow-xl',
          className
        )}
        style={{
          transitionDelay: `${delay}ms`,
          transform: isHovered
            ? `perspective(1000px) rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 8}deg) scale(1.02)`
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
        }}
      >
        {/* Shine effect on hover */}
        {enableHover && isHovered && (
          <div
            className="absolute inset-0 pointer-events-none rounded-lg opacity-20"
            style={{
              background: `radial-gradient(circle at ${(mousePos.x + 0.5) * 100}% ${(mousePos.y + 0.5) * 100}%, hsl(var(--primary) / 0.3), transparent 50%)`,
            }}
          />
        )}

        {title && (
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-sm flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn('relative z-10', !title && 'pt-6')}>
          {children}
        </CardContent>
      </Card>
    </div>
  );
};
