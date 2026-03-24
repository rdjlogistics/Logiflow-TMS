import { CheckCircle, Circle, Truck, Package, MapPin, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
    <motion.div
      className={cn('space-y-0', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {steps.map((step, index) => {
        const IconComponent = stepIcons[step.id] || Circle;
        
        return (
          <motion.div
            key={step.id}
            variants={itemVariants}
            className="flex gap-3"
          >
            {/* Timeline line and dot */}
            <div className="flex flex-col items-center">
              <motion.div
                layout
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center relative',
                  step.completed
                    ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/30'
                    : step.current
                    ? 'bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg shadow-primary/30'
                    : 'bg-muted/50 text-muted-foreground border-2 border-muted'
                )}
                animate={{
                  scale: step.current ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Pulse ring for current step */}
                {step.current && (
                  <>
                    <motion.span
                      className="absolute inset-0 rounded-full bg-primary/30"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.span
                      className="absolute inset-0 rounded-full bg-primary/20"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    />
                  </>
                )}
                
                <AnimatePresence mode="wait">
                  {step.completed ? (
                    <motion.span
                      key="check"
                      variants={checkVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex items-center justify-center"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </motion.span>
                  ) : step.current ? (
                    <motion.span
                      key="truck"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex items-center justify-center"
                    >
                      <Truck className="w-5 h-5 animate-bounce-subtle" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="icon"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex items-center justify-center"
                    >
                      <IconComponent className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="relative w-0.5 h-14 bg-muted/30 overflow-hidden">
                  <motion.div
                    className="absolute top-0 left-0 w-full bg-gradient-to-b from-green-500 to-green-400 origin-top"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: step.completed ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 80, damping: 20, delay: index * 0.15 }}
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
          </motion.div>
        );
      })}
      
      {/* CSS for moving dot animation */}
      <style>{`
        @keyframes moveDown {
          0%, 100% { top: 0; opacity: 1; }
          50% { top: calc(100% - 8px); opacity: 0.5; }
        }
      `}</style>
    </motion.div>
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
