import * as React from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================
// Optimized Image Loader with Blur Placeholder
// ============================================

interface ImageLoaderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  aspectRatio?: "square" | "video" | "portrait" | "wide" | number;
  blur?: boolean;
  blurDataUrl?: string;
  priority?: boolean;
  onLoadComplete?: () => void;
}

export function ImageLoader({
  src,
  alt,
  fallback,
  aspectRatio = "square",
  blur = true,
  blurDataUrl,
  priority = false,
  onLoadComplete,
  className,
  ...props
}: ImageLoaderProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const aspectRatioValue = React.useMemo(() => {
    if (typeof aspectRatio === "number") return aspectRatio;
    const ratios = { square: 1, video: 16 / 9, portrait: 3 / 4, wide: 21 / 9 };
    return ratios[aspectRatio];
  }, [aspectRatio]);

  React.useEffect(() => {
    if (priority) return;
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (img.dataset.src) img.src = img.dataset.src;
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: "200px" }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoadComplete?.();
  };

  const blurPlaceholder = blurDataUrl || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${aspectRatioValue * 10} 10'%3E%3Crect fill='%231a1a2e' width='100%25' height='100%25'/%3E%3C/svg%3E`;

  if (hasError) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-xl bg-muted flex items-center justify-center", className)}
        style={{ aspectRatio: aspectRatioValue }}
      >
        {fallback || (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">Afbeelding niet beschikbaar</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{ aspectRatio: aspectRatioValue }}
    >
      {/* Blur placeholder */}
      {blur && !isLoaded && (
        <div
          className="absolute inset-0 animate-pulse transition-opacity duration-300"
          style={{
            backgroundImage: `url("${blurPlaceholder}")`,
            backgroundSize: "cover",
            filter: "blur(20px)",
            transform: "scale(1.1)",
            opacity: isLoaded ? 0 : 1,
          }}
        />
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={priority ? src : undefined}
        data-src={!priority ? src : undefined}
        alt={alt}
        onLoad={handleLoad}
        onError={() => setHasError(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0 invisible"
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...props}
      />

      {/* Loading shimmer */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 skeleton-shimmer" />
      )}
    </div>
  );
}

// ============================================
// Avatar with Lazy Loading
// ============================================

interface LazyAvatarProps {
  src?: string | null;
  alt: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const avatarSizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function LazyAvatar({ src, alt, fallback, size = "md", className }: LazyAvatarProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const initials = React.useMemo(() => {
    if (fallback) return fallback;
    return alt.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
  }, [alt, fallback]);

  const showFallback = !src || hasError;

  return (
    <div className={cn("relative overflow-hidden rounded-full bg-muted flex items-center justify-center", avatarSizes[size], className)}>
      {showFallback ? (
        <span className="font-semibold text-muted-foreground">{initials}</span>
      ) : (
        <>
          {!isLoaded && <div className="absolute inset-0 skeleton-shimmer rounded-full" />}
          <img
            src={src}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            loading="lazy"
          />
        </>
      )}
    </div>
  );
}

// ============================================
// Background Image with Lazy Loading
// ============================================

interface LazyBackgroundProps {
  src: string;
  children?: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  blur?: boolean;
}

export function LazyBackground({ src, children, className, overlayClassName, blur = true }: LazyBackgroundProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.onload = () => setIsLoaded(true);
            img.src = src;
            observer.unobserve(container);
          }
        });
      },
      { rootMargin: "100px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: isLoaded ? `url(${src})` : undefined,
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? "scale(1)" : blur ? "scale(1.1)" : "scale(1)",
          filter: isLoaded ? "blur(0px)" : blur ? "blur(20px)" : "none",
        }}
      />

      {/* Loading placeholder */}
      {!isLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}

      {/* Overlay */}
      {overlayClassName && <div className={cn("absolute inset-0", overlayClassName)} />}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
