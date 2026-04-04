import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll naar boven"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/80 hover:text-white shadow-lg shadow-black/20 transition-all duration-200 hover:scale-110 active:scale-95 animate-in fade-in zoom-in-75 duration-200"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
