import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Layers, 
  Sun, 
  Moon, 
  Satellite, 
  Monitor,
  Circle,
  Navigation2,
  Car,
  Truck,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type MapTheme = 'auto' | 'light' | 'dark' | 'satellite';
export type MarkerStyle = 'dot' | 'arrow' | 'car' | 'truck';

interface MapThemeSelectorProps {
  theme: MapTheme;
  markerStyle: MarkerStyle;
  onThemeChange: (theme: MapTheme) => void;
  onMarkerStyleChange: (style: MarkerStyle) => void;
  className?: string;
}

const themeOptions: { value: MapTheme; label: string; icon: React.ReactNode }[] = [
  { value: 'auto', label: 'Automatisch', icon: <Monitor className="h-4 w-4" /> },
  { value: 'light', label: 'Licht', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Donker', icon: <Moon className="h-4 w-4" /> },
  { value: 'satellite', label: 'Satelliet', icon: <Satellite className="h-4 w-4" /> },
];

const markerOptions: { value: MarkerStyle; label: string; icon: React.ReactNode }[] = [
  { value: 'dot', label: 'Bolletje', icon: <Circle className="h-4 w-4" /> },
  { value: 'arrow', label: 'Pijl', icon: <Navigation2 className="h-4 w-4" /> },
  { value: 'car', label: 'Auto', icon: <Car className="h-4 w-4" /> },
  { value: 'truck', label: 'Vrachtwagen', icon: <Truck className="h-4 w-4" /> },
];

export const MapThemeSelector = React.forwardRef<HTMLDivElement, MapThemeSelectorProps>(
  ({ theme, markerStyle, onThemeChange, onMarkerStyleChange, className }, ref) => {
    return (
      <div ref={ref} className={className}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                "h-11 w-11 rounded-xl bg-background/95 backdrop-blur-xl shadow-xl border border-border/50",
                "hover:bg-accent active:scale-95 transition-all duration-150",
                "touch-manipulation"
              )}
            >
              <Layers className="h-5 w-5" />
              <span className="sr-only">Kaart instellingen</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="bottom"
            sideOffset={8}
            className="w-56 z-[1000] bg-popover/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-xl"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wide">
              Kaartweergave
            </DropdownMenuLabel>
            {themeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onThemeChange(option.value)}
                className={cn(
                  "gap-3 cursor-pointer min-h-[44px] px-3 touch-manipulation rounded-lg mx-1",
                  theme === option.value && "bg-primary/10"
                )}
              >
                <span className={cn(
                  "transition-colors",
                  theme === option.value ? "text-primary" : "text-muted-foreground"
                )}>
                  {option.icon}
                </span>
                <span className="flex-1 text-sm font-medium">{option.label}</span>
                {theme === option.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator className="my-2" />
            
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wide">
              Locatie icoon
            </DropdownMenuLabel>
            {markerOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onMarkerStyleChange(option.value)}
                className={cn(
                  "gap-3 cursor-pointer min-h-[44px] px-3 touch-manipulation rounded-lg mx-1",
                  markerStyle === option.value && "bg-primary/10"
                )}
              >
                <span className={cn(
                  "transition-colors",
                  markerStyle === option.value ? "text-primary" : "text-muted-foreground"
                )}>
                  {option.icon}
                </span>
                <span className="flex-1 text-sm font-medium">{option.label}</span>
                {markerStyle === option.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);

MapThemeSelector.displayName = 'MapThemeSelector';
