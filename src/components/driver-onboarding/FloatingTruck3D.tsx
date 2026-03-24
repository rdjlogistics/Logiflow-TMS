import { motion } from 'framer-motion';
import { Truck, MapPin, Navigation, Sparkles, Star } from 'lucide-react';

export const FloatingTruck3D = () => {
  return (
    <div className="relative w-full h-80 flex items-center justify-center perspective-1000">
      {/* Background glow effects */}
      <motion.div
        className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-primary/30 via-pink-500/20 to-purple-600/30 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${20 + i * 12}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            x: [-5, 5, -5],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        >
          {i % 3 === 0 ? (
            <Star className="w-3 h-3 text-primary fill-primary" />
          ) : i % 3 === 1 ? (
            <Sparkles className="w-4 h-4 text-pink-400" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-pink-500" />
          )}
        </motion.div>
      ))}

      {/* Main truck container with 3D effect */}
      <motion.div
        className="relative z-10"
        animate={{
          y: [-8, 8, -8],
          rotateY: [-5, 5, -5],
          rotateX: [2, -2, 2],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Truck shadow */}
        <motion.div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/30 rounded-full blur-xl"
          animate={{
            scale: [1, 0.9, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Truck icon with glassmorphism */}
        <motion.div
          className="relative p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl"
          whileHover={{ scale: 1.05 }}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px -15px hsl(var(--primary) / 0.3)',
          }}
        >
          <motion.div
            animate={{
              rotate: [0, 2, -2, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
            }}
          >
            <Truck className="w-24 h-24 text-primary" strokeWidth={1.5} />
          </motion.div>

          {/* Animated route dots */}
          <motion.div
            className="absolute -right-4 top-1/2 -translate-y-1/2"
            animate={{ x: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Navigation className="w-6 h-6 text-pink-500 rotate-45" />
          </motion.div>

          <motion.div
            className="absolute -left-4 top-1/4"
            animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          >
            <MapPin className="w-5 h-5 text-emerald-400 fill-emerald-400/30" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Speed lines */}
      <motion.div
        className="absolute left-10 top-1/2 -translate-y-1/2 space-y-3"
        animate={{ opacity: [0.2, 0.6, 0.2], x: [-20, 0, -20] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
        <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent rounded-full ml-4" />
        <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full" />
      </motion.div>
    </div>
  );
};
