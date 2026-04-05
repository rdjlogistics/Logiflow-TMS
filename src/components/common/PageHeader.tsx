import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  /** Auto-generate breadcrumbs from current route (uses routeLabels map) */
  autoBreadcrumb?: boolean;
}

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  'trips': 'Ritten',
  'orders': 'Orders',
  'customers': 'Klanten',
  'carriers': 'Charters',
  'drivers': 'Chauffeurs',
  'vehicles': 'Vloot',
  'invoices': 'Facturen',
  'cashflow': 'Cashflow',
  'diesel': 'Diesel Staffels',
  'quotes': 'Offertes',
  'sales': 'Sales',
  'planning': 'Planning',
  'finance': 'Finance',
  'operations': 'Operaties',
  'reporting': 'Rapportages',
  'kpi': 'KPI Dashboard',
  'admin': 'Admin',
  'settings': 'Instellingen',
  'crm': 'CRM',
  'compliance': 'Compliance',
  'claims': 'Claims',
  'pricing': 'Tarieven',
  'tendering': 'Tendermanagement',
  'wms': 'Magazijn',
  'enterprise': 'Enterprise',
  'migration': 'Datamigratia',
  'network': 'Netwerk',
  'portal': 'Portaal',
  'new': 'Nieuw',
  'edit': 'Bewerken',
  'detail': 'Details',
};

function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/' }];

  let path = '';
  for (let i = 0; i < parts.length; i++) {
    path += `/${parts[i]}`;
    const label = ROUTE_LABELS[parts[i]] ?? capitalize(parts[i]);
    const isLast = i === parts.length - 1;
    crumbs.push({ label, href: isLast ? undefined : path });
  }

  return crumbs;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
  autoBreadcrumb = true,
}: PageHeaderProps) {
  const autoCrumbs = useBreadcrumbs();
  const crumbs = breadcrumbs ?? (autoBreadcrumb ? autoCrumbs : []);

  return (
    <div className={cn("mb-6", className)}>
      {/* Breadcrumbs */}
      {crumbs.length > 1 && (
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <li key={index} className="flex items-center gap-1">
                  {index === 0 && <Home className="h-3.5 w-3.5 shrink-0" />}
                  {crumb.href && !isLast ? (
                    <Link
                      to={crumb.href}
                      className="hover:text-foreground transition-colors truncate max-w-[120px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn("truncate max-w-[160px]", isLast && "text-foreground font-medium")}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
