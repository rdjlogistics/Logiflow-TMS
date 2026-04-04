import { ReactNode, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  variant?: "fade" | "slide-up" | "slide-left" | "slide-right" | "scale" | "blur";
  delay?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
}

const variantClasses: Record<string, string> = {
  fade: "",
  "slide-up": "",
  "slide-left": "reveal-slide-left",
  "slide-right": "reveal-slide-right",
  scale: "reveal-scale",
  blur: "reveal-blur",
};

export function ScrollReveal({
  children,
  className,
  variant = "slide-up",
  delay = 0,
  duration = 0.4,
  once = true,
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        isVisible ? "reveal-visible" : `reveal-hidden ${variantClasses[variant] || ""}`,
        className
      )}
      style={{
        transitionDelay: `${delay}s`,
        transitionDuration: `${duration}s`,
      }}
    >
      {children}
    </div>
  );
}

// Staggered children reveal
interface StaggeredRevealProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  variant?: "fade" | "slide-up" | "scale";
  once?: boolean;
}

export function StaggeredReveal({
  children,
  className,
  staggerDelay = 0.05,
  variant = "slide-up",
  once = true,
}: StaggeredRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn(
            isVisible ? "reveal-visible" : `reveal-hidden ${variantClasses[variant] || ""}`
          )}
          style={{
            transitionDelay: `${index * staggerDelay}s`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// Parallax scroll effect — pure JS, no framer-motion
interface ParallaxProps {
  children: ReactNode;
  className?: string;
  speed?: number;
}

export function Parallax({ children, className, speed = 0.2 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const scrolled = (window.innerHeight - rect.top) / window.innerHeight;
        setOffset(scrolled * speed * 100);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return (
    <div
      ref={ref}
      className={cn("will-change-transform", className)}
      style={{ transform: `translateY(${offset}px)` }}
    >
      {children}
    </div>
  );
}

// Counter animation for numbers — pure JS
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  duration = 1,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;

    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, hasAnimated]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// Blur reveal — CSS only
export function BlurReveal({ 
  children, 
  className,
  delay = 0,
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        isVisible ? "reveal-visible" : "reveal-hidden reveal-blur",
        className
      )}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
