/**
 * Batch T15: ScrollToTop
 * Floating button that appears after scrolling 300px down.
 * Glassmorphism styling + Framer Motion spring animation.
 * Drop anywhere in a layout — no props needed.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // check on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-to-top"
          initial={{ opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={scrollToTop}
          aria-label="Scroll naar boven"
          className={[
            'fixed bottom-6 right-6 z-50',
            'flex items-center justify-center',
            'w-11 h-11 rounded-full',
            'bg-white/10 backdrop-blur-xl',
            'border border-white/20',
            'text-white/80 hover:text-white',
            'shadow-lg shadow-black/20',
            'transition-colors duration-150',
          ].join(' ')}
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
