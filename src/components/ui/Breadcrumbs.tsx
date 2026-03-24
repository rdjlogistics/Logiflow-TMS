import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumbs — glassmorphism navigation trail.
 * Last item is always rendered as plain text (non-clickable).
 */
const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm w-fit",
        className
      )}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1">
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "text-sm",
                    isLast
                      ? "text-white/90 font-medium"
                      : "text-white/50 cursor-default"
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  {item.label}
                </Link>
              )}

              {!isLast && (
                <ChevronRight
                  className="h-3.5 w-3.5 text-white/25 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
