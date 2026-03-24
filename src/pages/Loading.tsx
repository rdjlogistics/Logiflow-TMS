import { motion } from "framer-motion";
import { Truck } from "lucide-react";

const Loading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Glassmorphism card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative flex flex-col items-center gap-8 px-12 py-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl"
      >
        {/* Soft glow behind the icon */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 pointer-events-none" />

        {/* Animated truck + spinner ring */}
        <div className="relative flex items-center justify-center w-20 h-20">
          {/* Spinning ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400/80 border-r-blue-400/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
          />
          {/* Second slower ring */}
          <motion.div
            className="absolute inset-2 rounded-full border border-transparent border-b-purple-400/50"
            animate={{ rotate: -360 }}
            transition={{ duration: 2.2, ease: "linear", repeat: Infinity }}
          />
          {/* Icon */}
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
          >
            <Truck className="h-8 w-8 text-blue-300" />
          </motion.div>
        </div>

        {/* Pulsing dots */}
        <motion.div
          className="flex items-center gap-2"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: { staggerChildren: 0.18 },
            },
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400/70"
              variants={{
                hidden: { opacity: 0.3, scale: 0.8 },
                visible: {
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.1, 0.8],
                  transition: {
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                },
              }}
            />
          ))}
        </motion.div>

        {/* Label */}
        <motion.p
          className="text-sm text-white/50 tracking-wide select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          LogiFlow wordt geladen…
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Loading;
