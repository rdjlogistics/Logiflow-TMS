import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Layers, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hapticSwitch } from '@/lib/haptics';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export type MapStyleId = 'auto' | 'standard' | 'navigation-day' | 'navigation-night' | 'streets' | 'outdoors' | 'satellite';

interface MapStyle {
  id: MapStyleId;
  name: string;
  url: string;
  staticStyleId: string;
  previewLon: number;
  previewLat: number;
  previewZoom: number;
}

const mapStyles: MapStyle[] = [
  {
    id: 'auto',
    name: 'Auto (systeem)',
    url: '',
    staticStyleId: 'navigation-guidance-day-v4',
    previewLon: 4.9041,
    previewLat: 52.3676,
    previewZoom: 10,
  },
  {
    id: 'standard',
    name: 'Standaard',
    url: 'mapbox://styles/mapbox/standard',
    staticStyleId: 'streets-v12',
    previewLon: -0.0833,
    previewLat: 51.5085,
    previewZoom: 13.5,
  },
  {
    id: 'streets',
    name: 'Straten',
    url: 'mapbox://styles/mapbox/streets-v12',
    staticStyleId: 'streets-v12',
    previewLon: 4.9041,
    previewLat: 52.3676,
    previewZoom: 10,
  },
  {
    id: 'satellite',
    name: 'Satelliet',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    staticStyleId: 'satellite-streets-v12',
    previewLon: -5.93,
    previewLat: 54.60,
    previewZoom: 9,
  },
  {
    id: 'outdoors',
    name: 'Buiten',
    url: 'mapbox://styles/mapbox/outdoors-v12',
    staticStyleId: 'outdoors-v12',
    previewLon: -3.7038,
    previewLat: 40.4168,
    previewZoom: 10.5,
  },
  {
    id: 'navigation-day',
    name: 'Navigatie (dag)',
    url: 'mapbox://styles/mapbox/navigation-guidance-day-v4',
    staticStyleId: 'navigation-guidance-day-v4',
    previewLon: 0.1546,
    previewLat: 47.9961,
    previewZoom: 10,
  },
  {
    id: 'navigation-night',
    name: 'Navigatie (nacht)',
    url: 'mapbox://styles/mapbox/navigation-guidance-night-v4',
    staticStyleId: 'navigation-guidance-night-v4',
    previewLon: 2.3522,
    previewLat: 48.8566,
    previewZoom: 10,
  },
];

function MapPreviewImage({ 
  style, 
  token,
  isSelected,
  size = 'normal'
}: { 
  style: MapStyle; 
  token: string | null;
  isSelected: boolean;
  size?: 'small' | 'normal';
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getStaticImageUrl = () => {
    if (!token) return null;
    const imgSize = size === 'small' ? '100x66' : '200x134';
    return `https://api.mapbox.com/styles/v1/mapbox/${style.staticStyleId}/static/${style.previewLon},${style.previewLat},${style.previewZoom},0/${imgSize}@2x?access_token=${token}`;
  };

  const imageUrl = getStaticImageUrl();

  const getFallbackGradient = () => {
    switch (style.id) {
      case 'auto':
      case 'navigation-day':
        return 'bg-gradient-to-br from-sky-200 via-blue-100 to-indigo-200';
      case 'navigation-night':
        return 'bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-900';
      case 'standard':
      case 'streets':
        return 'bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100';
      case 'outdoors':
        return 'bg-gradient-to-br from-emerald-200 via-green-100 to-lime-200';
      case 'satellite':
        return 'bg-gradient-to-br from-emerald-900 via-slate-800 to-stone-700';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className={cn("absolute inset-0", getFallbackGradient())} />
      {imageUrl && !imageError && (
        <img
          src={imageUrl}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      )}
      {!imageLoaded && !imageError && token && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      )}
      {isSelected && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "absolute flex items-center justify-center shadow-lg bg-primary",
            size === 'small' 
              ? "bottom-1 right-1 w-4 h-4 rounded-full"
              : "bottom-2 right-2 w-6 h-6 rounded-full"
          )}
        >
          <Check className={cn("text-primary-foreground", size === 'small' ? "h-2.5 w-2.5" : "h-3.5 w-3.5")} />
        </motion.div>
      )}
    </div>
  );
}

const STORAGE_KEY = 'fuel-stations-map-style';

interface MapStyleSelectorProps {
  currentStyle: MapStyleId;
  onStyleChange: (styleId: MapStyleId, url: string) => void;
  className?: string;
}

export function MapStyleSelector({ currentStyle, onStyleChange, className }: MapStyleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { token } = useMapboxToken();
  const isMobile = useIsMobile();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as MapStyleId | null;
    if (saved && mapStyles.some(s => s.id === saved)) {
      const url = getStyleUrl(saved);
      if (url !== getStyleUrl(currentStyle)) {
        onStyleChange(saved, url);
      }
    }
  }, []);

  const getStyleUrl = (styleId: MapStyleId): string => {
    if (styleId === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark 
        ? 'mapbox://styles/mapbox/navigation-guidance-night-v4'
        : 'mapbox://styles/mapbox/navigation-guidance-day-v4';
    }
    return mapStyles.find(s => s.id === styleId)?.url || mapStyles[1].url;
  };

  const handleSelect = (styleId: MapStyleId) => {
    hapticSwitch();
    localStorage.setItem(STORAGE_KEY, styleId);
    const url = getStyleUrl(styleId);
    onStyleChange(styleId, url);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      handleClose();
    }
  };

  const currentStyleName = mapStyles.find(s => s.id === currentStyle)?.name || 'Auto';

  // Desktop: Use dropdown menu
  if (!isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "h-9 gap-2 px-3 rounded-lg bg-background/90 backdrop-blur-lg border-border/40 shadow-lg hover:bg-accent",
              className
            )}
          >
            <Layers className="h-4 w-4" />
            <span className="text-sm font-medium">{currentStyleName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2" sideOffset={8}>
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium px-2 pb-2">
            Kaartstijl
          </DropdownMenuLabel>
          <div className="grid grid-cols-2 gap-2">
            {mapStyles.map((style) => {
              const isSelected = currentStyle === style.id;
              return (
                <button
                  key={style.id}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all",
                    "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                    isSelected && "bg-primary/10 ring-2 ring-primary"
                  )}
                  onClick={() => handleSelect(style.id)}
                >
                  <div
                    className={cn(
                      "relative w-full aspect-[4/3] rounded-md overflow-hidden",
                      "ring-1 ring-border/50",
                      isSelected && "ring-primary"
                    )}
                  >
                    <MapPreviewImage style={style} token={token} isSelected={isSelected} size="small" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium text-center leading-tight",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}>
                    {style.name}
                  </span>
                </button>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Mobile: Use bottom sheet (existing implementation)
  const bottomSheet = isOpen ? createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 touch-pan-y"
            style={{ 
              zIndex: 9999,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)' 
            }}
          >
            <div className="bg-card/95 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t border-x border-border/20">
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="flex items-center justify-between px-5 pb-3">
                <h3 className="font-semibold text-foreground tracking-tight">Kaartstijl</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full hover:bg-muted/50"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="px-4 pb-5 grid grid-cols-3 gap-2.5">
                {mapStyles.map((style, index) => {
                  const isSelected = currentStyle === style.id;
                  return (
                    <motion.button
                      key={style.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      className="flex flex-col items-center gap-1.5 touch-manipulation"
                      onClick={() => handleSelect(style.id)}
                    >
                      <div
                        className={cn(
                          "relative w-full aspect-[4/3] rounded-xl overflow-hidden transition-all duration-150 active:scale-[0.96]",
                          "ring-2 ring-offset-2 ring-offset-card",
                          isSelected 
                            ? 'ring-primary shadow-lg shadow-primary/25'
                            : 'ring-transparent hover:ring-border/50'
                        )}
                      >
                        <MapPreviewImage style={style} token={token} isSelected={isSelected} />
                      </div>
                      <span className={cn(
                        "text-[11px] font-medium transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}>
                        {style.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        className={cn(
          "h-10 w-10 rounded-xl bg-background/90 backdrop-blur-lg border-border/40 shadow-lg hover:bg-accent",
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <Layers className="h-5 w-5" />
      </Button>

      {bottomSheet}
    </>
  );
}

// Helper to get initial style URL
export function getInitialMapStyle(): { id: MapStyleId; url: string } {
  const saved = localStorage.getItem(STORAGE_KEY) as MapStyleId | null;
  const styleId = saved && mapStyles.some(s => s.id === saved) ? saved : 'auto';
  
  if (styleId === 'auto') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      id: 'auto',
      url: isDark 
        ? 'mapbox://styles/mapbox/navigation-guidance-night-v4'
        : 'mapbox://styles/mapbox/navigation-guidance-day-v4',
    };
  }
  
  return {
    id: styleId,
    url: mapStyles.find(s => s.id === styleId)?.url || mapStyles[1].url,
  };
}
