import { CheckCircle, Circle, Truck, Package, MapPin, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingStep {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  current: boolean;
}

interface TrackingTimelineProps {
  steps: TrackingStep[];
  className?: string;
}

const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  created: Package,
  picked_up: MapPin,
  in_transit: Navigation,
  nearby: MapPin,
  delivered: CheckCircle,
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } },
};

const checkVariants = {
  initial: { scale: 0, rotate: -90 },
  animate: { scale: 1, rotate: 0 },
  exit: { scale: 0, rotate: 90 },
};

export const TrackingTimeline = ({ steps, className }: TrackingTimelineProps) => {
  return (
    <div
      className={cn('space-y-0', className)}
    >
      {steps.map((step, index) => {
        const IconComponent = stepIcons[step.id] || Circle;
        
        return (
          <div
            key={step.id}
            className="flex gap-3"
          >
            {/* Timeline line and dot */}
            <div className="flex flex-col items-center">
              <div

                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center relative',
                  step.completed
                    ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/30'
                    : step.current
                    ? 'bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg shadow-primary/30'
                    : 'bg-muted/50 text-muted-foreground border-2 border-muted'
                )}
              >
                {/* Pulse ring for current step */}
                {step.current && (
                  <>
                    <span
                      className="absolute inset-0 rounded-full bg-primary/30"
                    />
                    <span
                      className="absolute inset-0 rounded-full bg-primary/20"
                    />
                  </>
                )}
                  {step.completed ? (
                    <span
                      key="check"
                      className="flex items-center justify-center"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </span>
                  ) : step.current ? (
                    <span
                      key="truck"
                      className="flex items-center justify-center"
                    >
                      <Truck className="w-5 h-5 animate-bounce-subtle" />
                    </span>
                  ) : (
                    <span
                      key="icon"
                      className="flex items-center justify-center"
                    >
                      <IconComponent className="w-4 h-4" />
                    </span>
                  )}
              </div>
              
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="relative w-0.5 h-14 bg-muted/30 overflow-hidden">
                  <div
                    className="absolute top-0 left-0 w-full bg-gradient-to-b from-green-500 to-green-400 origin-top"
                    style={{ height: '100%' }}
                  />
                  
                  {/* Moving dot animation for current step */}
                  {step.current && (
                    <div 
                      className="absolute w-2 h-2 -left-[3px] bg-primary rounded-full shadow-lg shadow-primary/50"
                      style={{
                        animation: 'moveDown 1.5s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="pb-6 pt-2">
              <p
                className={cn(
                  'font-semibold text-sm',
                  step.completed
                    ? 'text-green-600 dark:text-green-400'
                    : step.current
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className={cn(
                  'text-xs mt-1',
                  step.current 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground'
                )}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
      
      {/* CSS for moving dot animation */}
      <style>{`
        @keyframes moveDown {
          0%, 100% { top: 0; opacity: 1; }
          50% { top: calc(100% - 8px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

interface DeliveryProgressProps {
  status: string;
  distanceKm: number | null;
  isWithinRadius: boolean;
  className?: string;
}

export const DeliveryProgress = ({
  status,
  distanceKm,
  isWithinRadius,
  className,
}: DeliveryProgressProps) => {
  const steps: TrackingStep[] = [
    {
      id: 'created',
      label: 'Order aangemaakt',
      completed: true,
      current: status === 'gepland',
    },
    {
      id: 'picked_up',
      label: 'Opgehaald',
      description: ['onderweg', 'geladen', 'afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(status) 
        ? 'Lading is opgehaald'
        : undefined,
      completed: ['onderweg', 'geladen', 'afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(status),
      current: status === 'geladen',
    },
    {
      id: 'in_transit',
      label: 'Onderweg',
      description: isWithinRadius && distanceKm !== null
        ? `Nog ${distanceKm.toFixed(1)} km`
        : distanceKm !== null
        ? `${distanceKm.toFixed(0)} km verwijderd`
        : undefined,
      completed: ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(status),
      current: status === 'onderweg' || status === 'geladen',
    },
    {
      id: 'nearby',
      label: 'In de buurt',
      description: isWithinRadius ? 'Chauffeur is dichtbij' : undefined,
      completed: ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(status) || (isWithinRadius && distanceKm !== null && distanceKm < 5),
      current: isWithinRadius && distanceKm !== null && distanceKm >= 1 && distanceKm < 5,
    },
    {
      id: 'delivered',
      label: 'Afgeleverd',
      completed: ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(status),
      current: false,
    },
  ];

  return <TrackingTimeline steps={steps} className={className} />;
};
