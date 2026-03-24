import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Route to breadcrumb mapping
const ROUTE_LABELS: Record<string, string> = {
  '': 'Command Center',
  'customers': 'Klanten',
  'orders': 'Orders',
  'trips': 'Ritten',
  'vehicles': 'Voertuigen',
  'carriers': 'Charters',
  'invoices': 'Facturen',
  'payments': 'Betalingen',
  'messenger': 'Messenger',
  'track-chauffeurs': 'Track Chauffeurs',
  'admin-settings': 'Instellingen',
  'portal': 'Portaal',
  'b2b': 'B2B',
  'b2c': 'B2C',
  'wms': 'Warehouse',
  'finance': 'Financiën',
  'cashflow': 'Cashflow',
  'tendering': 'Tendering',
  'enterprise': 'Enterprise',
  'crm': 'CRM',
  'relationships': 'Relaties',
  'claims': 'Claims',
  'tracking': 'Track & Trace',
  'planning': 'Planning',
  'program': 'Programma',
  'shipments': 'Zendingen',
  'book': 'Boeken',
  'settings': 'Instellingen',
  'edit': 'Bewerken',
  'new': 'Nieuw',
  // Community
  'community': 'Community',
  'workspaces': 'Workspaces',
  'joint-orders': 'Gezamenlijke Ritten',
  'ledger': 'Ledger',
  'settlements': 'Afrekeningen',
  // Legacy redirect
  'control-tower': 'Command Center',
  'exceptions': 'Exceptions',
  'playbooks': 'Playbooks',
  'alerts': 'Alerts',
  'sla': 'SLA Monitor',
  // Freight Audit
  'freight-audit': 'Freight Audit',
  'queue': 'Wachtrij',
  'disputes': 'Geschillen',
  'rules': 'Regels',
  // Compliance
  'compliance': 'Compliance',
  'driver-docs': 'Chauffeur Docs',
  'vehicle-docs': 'Voertuig Docs',
  'expiry': 'Vervaldata',
  'rosters': 'Roosters',
  'constraints': 'Constraints',
  // Integrations
  'integrations': 'Integraties',
  'imports': 'Imports',
  'webhooks': 'Webhooks',
  'api-keys': 'API Keys',
  'email': 'Email',
  'mapping': 'Mapping',
  'logs': 'Logs',
  'ecommerce': 'E-commerce',
  'telematics': 'Telematics',
  'edi': 'EDI',
  'customs': 'Customs',
  // AI
  'ai': 'AI',
  'auto-dispatch': 'Auto Dispatch',
  'simulation': 'Simulatie',
  'ocr': 'Document OCR',
  'anomaly': 'Anomaly Detection',
  // Enterprise
  'automation': 'Automation',
  'reconciliation': 'Reconciliation',
  'health': 'System Health',
  'policies': 'Policies',
  'security': 'Security',
  'holds': 'Holds',
  'data-quality': 'Data Quality',
  'autopilot': 'Autopilot',
  'ai-plan': 'AI Plan',
  // Admin
  'admin': 'Admin',
  'customer-linking': 'Klant Koppeling',
  'contract-templates': 'Contract Sjablonen',
  'contracts': 'Contracten',
  'migration': 'Migratie',
  'qa': 'QA',
  'branding': 'Branding',
  'document-templates': 'Document Sjablonen',
  'driver-onboarding': 'Chauffeur Onboarding',
  'help': 'Help Center',
  'accounting': 'Accounting',
  'api': 'API',
  // Pricing
  'pricing': 'Prijzen',
  'rate-contracts': 'Tariefcontracten',
  'dynamic': 'Dynamic Pricing',
  // Analytics
  'analytics': 'Analytics',
  'kpi': 'KPI',
  // Driver
  'driver': 'Chauffeur',
  'onboarding': 'Onboarding',
  'shifts': 'Shifts',
  'assign': 'Toewijzing',
  // Operations
  'operations': 'Operations',
  'pod': 'Digital POD',
  // Maintenance
  'maintenance': 'Onderhoud',
  'predictive': 'Predictief',
  // Other
  'notifications': 'Notificaties',
  'marketplace': 'Vrachtbeurs',
  'network': 'Netwerk',
  'fleet': 'Vloot',
  'rates': 'Tarieven',
  'sustainability': 'Duurzaamheid',
  'co2': 'CO₂',
  'optimization': 'Optimalisatie',
  'route-optimization': 'Route Optimalisatie',
  'fuel-stations': 'Tankstations',
  'chatgpt': 'ChatGPT',
  'products': 'Producten',
  'address-book': 'Adresboek',
  'install': 'Installeren',
  'moments': 'Momenten',
  'gifts': 'Cadeaus',
  'gift-policy': 'Cadeau Beleid',
  'profit': 'Winst',
  'costs': 'Kosten',
  'fuel-cards': 'Tankpassen',
  'bank': 'Bank',
  'reports': 'Rapportage',
  'goals': 'Doelen',
  'ai-coach': 'AI Coach',
  'collections': 'Incasso',
  'reporting': 'Rapportage',
  'templates': 'Sjablonen',
  'pools': 'Pools',
  'scorecards': 'Scorecards',
  'history': 'Geschiedenis',
  'dashboard': 'Dashboard',
  'inventory': 'Voorraad',
  'inbound': 'Ontvangst',
  'outbound': 'Verzending',
  'picking': 'Picking',
  'transfers': 'Transfers',
  'warehouses': 'Magazijnen',
  'labels': 'Labels',
  'cases': 'Cases',
  'account': 'Account',
  'track': 'Volgen',
  'self-service': 'Self-Service',
  'legal': 'Juridisch',
  'privacy': 'Privacy',
  'terms': 'Voorwaarden',
};

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();

  return useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    if (pathSegments.length === 0) {
      return [{ label: 'Command Center' }];
    }

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Command Center', href: '/' },
    ];

    let currentPath = '';
    
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;
      
      // Skip UUIDs
      if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        continue;
      }

      const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Last item has no href
      if (i === pathSegments.length - 1) {
        breadcrumbs.push({ label });
      } else {
        breadcrumbs.push({ label, href: currentPath });
      }
    }

    return breadcrumbs;
  }, [location.pathname]);
}

interface BreadcrumbsProps {
  className?: string;
  showHome?: boolean;
}

export function Breadcrumbs({ className, showHome = true }: BreadcrumbsProps) {
  const breadcrumbs = useBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-sm", className)}>
      <ol className="flex items-center gap-1.5">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
              
              {isLast ? (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : crumb.href ? (
                <Link
                  to={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {isFirst && showHome && <Home className="h-3.5 w-3.5" />}
                  {(!isFirst || !showHome) && crumb.label}
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
