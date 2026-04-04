import { Truck } from "lucide-react";

const Loading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="relative flex flex-col items-center gap-8 px-12 py-10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl animate-scale-fade-in">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 pointer-events-none" />

        <div className="relative flex items-center justify-center w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400/80 border-r-blue-400/30 animate-spin" style={{ animationDuration: '1.1s' }} />
          <div className="absolute inset-2 rounded-full border border-transparent border-b-purple-400/50 animate-spin" style={{ animationDuration: '2.2s', animationDirection: 'reverse' }} />
          <div className="animate-pulse">
            <Truck className="h-8 w-8 text-blue-300" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400/70 animate-dots-pulse"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>

        <p className="text-sm text-white/50 tracking-wide select-none animate-fade-in animate-delay-300">
          LogiFlow wordt geladen…
        </p>
      </div>
    </div>
  );
};

export default Loading;
