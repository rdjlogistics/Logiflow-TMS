import { Sparkles } from "lucide-react";

interface WizardHeaderProps {
  title: string;
  subtitle: string;
}

export const WizardHeader = ({ title, subtitle }: WizardHeaderProps) => {
  return (
    <div}
      className="relative text-center space-y-2 px-4"
    >
      {/* Ambient glow behind */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(var(--primary)/0.15),transparent)] blur-2xl" />
      
      <div}
        className="flex items-center justify-center gap-2 sm:gap-3"
      >
        <div
          className="flex-shrink-0"
        >
          <Sparkles className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
        </div>
        
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
          {title}
        </h1>
        
        <div
          className="flex-shrink-0"
        >
          <Sparkles className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
        </div>
      </div>
      
      <p}
        className="text-muted-foreground text-sm sm:text-base px-2"
      >
        {subtitle}
      </p>
    </div>
  );
};
