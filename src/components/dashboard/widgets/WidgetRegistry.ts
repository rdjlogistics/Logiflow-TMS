import { LucideIcon, Zap, Euro, TrendingUp, Fuel, Activity, BarChart3, PieChart, Link2, Sparkles, Map, Gauge, AlertCircle, MapPin, LineChart, LayoutDashboard, Truck, Shield, Receipt, Radio } from "lucide-react";

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';
export type WidgetCategory = 'operations' | 'finance' | 'insights' | 'analytics';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  defaultSize: WidgetSize;
  category: WidgetCategory;
  minHeight: number;
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  'action-queue': {
    id: 'action-queue',
    name: 'Actie Wachtrij',
    description: 'Openstaande taken die aandacht vereisen',
    icon: Zap,
    defaultSize: 'large',
    category: 'operations',
    minHeight: 400,
  },
  'finance-snapshot': {
    id: 'finance-snapshot',
    name: 'Finance Snapshot',
    description: 'Financieel overzicht met openstaande bedragen',
    icon: Euro,
    defaultSize: 'medium',
    category: 'finance',
    minHeight: 300,
  },
  'smart-insights': {
    id: 'smart-insights',
    name: 'AI Insights',
    description: 'Slimme waarschuwingen en aanbevelingen',
    icon: Sparkles,
    defaultSize: 'medium',
    category: 'insights',
    minHeight: 280,
  },
  'fuel-stations': {
    id: 'fuel-stations',
    name: 'Tankstations',
    description: 'Goedkoopste brandstofprijzen in de buurt',
    icon: Fuel,
    defaultSize: 'small',
    category: 'operations',
    minHeight: 200,
  },
  'activity-feed': {
    id: 'activity-feed',
    name: 'Recente Activiteit',
    description: 'Laatste updates en gebeurtenissen',
    icon: Activity,
    defaultSize: 'medium',
    category: 'operations',
    minHeight: 300,
  },
  'revenue-chart': {
    id: 'revenue-chart',
    name: 'Omzet Grafiek',
    description: 'Maandelijkse omzet en kosten visualisatie',
    icon: TrendingUp,
    defaultSize: 'large',
    category: 'analytics',
    minHeight: 320,
  },
  'trip-stats': {
    id: 'trip-stats',
    name: 'Rit Statistieken',
    description: 'Status verdeling en wekelijkse trends',
    icon: PieChart,
    defaultSize: 'large',
    category: 'analytics',
    minHeight: 350,
  },
  'quick-links': {
    id: 'quick-links',
    name: 'Snelle Links',
    description: 'Favoriete functies en pagina\'s',
    icon: Link2,
    defaultSize: 'small',
    category: 'operations',
    minHeight: 180,
  },
  // New World-Class Widgets
  'fleet-map': {
    id: 'fleet-map',
    name: 'Live Fleet Map',
    description: 'Real-time kaart met alle actieve voertuigen',
    icon: Map,
    defaultSize: 'large',
    category: 'operations',
    minHeight: 420,
  },
  'performance-metrics': {
    id: 'performance-metrics',
    name: 'Performance KPIs',
    description: 'OTIF, bezettingsgraad en on-time metrics',
    icon: Gauge,
    defaultSize: 'medium',
    category: 'analytics',
    minHeight: 320,
  },
  'alerts-widget': {
    id: 'alerts-widget',
    name: 'Alerts & Excepties',
    description: 'Kritieke waarschuwingen en SLA risico\'s',
    icon: AlertCircle,
    defaultSize: 'medium',
    category: 'operations',
    minHeight: 340,
  },
  'geographic-heatmap': {
    id: 'geographic-heatmap',
    name: 'Geografische Heatmap',
    description: 'Verdeling van ritten per regio',
    icon: MapPin,
    defaultSize: 'medium',
    category: 'analytics',
    minHeight: 320,
  },
  'trends-widget': {
    id: 'trends-widget',
    name: 'Omzet & Marge Trends',
    description: '6-maanden overzicht van omzet en marges',
    icon: LineChart,
    defaultSize: 'large',
    category: 'finance',
    minHeight: 400,
  },
  'executive-pl': {
    id: 'executive-pl',
    name: 'Executive P&L',
    description: 'Real-time P&L met marge tracking en OTIF trends',
    icon: LayoutDashboard,
    defaultSize: 'large',
    category: 'finance',
    minHeight: 380,
  },
  'ai-dispatch': {
    id: 'ai-dispatch',
    name: 'AI Dispatch',
    description: 'Intelligente chauffeur toewijzing met AI aanbevelingen',
    icon: Truck,
    defaultSize: 'large',
    category: 'operations',
    minHeight: 420,
  },
  'credit-health': {
    id: 'credit-health',
    name: 'Credit Health',
    description: 'DSO, overdue en kredietrisico indicatoren',
    icon: Shield,
    defaultSize: 'medium',
    category: 'finance',
    minHeight: 280,
  },
  'purchase-invoices': {
    id: 'purchase-invoices',
    name: 'Inkoopfacturen',
    description: 'Openstaande inkoopfacturen en betalingen',
    icon: Receipt,
    defaultSize: 'medium',
    category: 'finance',
    minHeight: 320,
  },
  'live-events': {
    id: 'live-events',
    name: 'Live Events',
    description: 'Realtime trip status updates en nieuwe orders',
    icon: Radio,
    defaultSize: 'medium',
    category: 'operations',
    minHeight: 300,
  },
  'ai-usage': {
    id: 'ai-usage',
    name: 'AI Verbruik',
    description: 'Real-time credit verbruik en dagelijkse trends',
    icon: Sparkles,
    defaultSize: 'small',
    category: 'analytics',
    minHeight: 240,
  },
  'batch-status': {
    id: 'batch-status',
    name: 'Dagelijkse Batches',
    description: 'Status en handmatige uitvoering van batch-processen',
    icon: Activity,
    defaultSize: 'small',
    category: 'operations',
    minHeight: 260,
  },
};

export const DEFAULT_WIDGET_ORDER = [
  'fleet-map',
  'performance-metrics',
  'action-queue',
  'alerts-widget',
  'finance-snapshot',
  'trends-widget',
  'smart-insights',
  'geographic-heatmap',
];

export const ALL_WIDGET_IDS = Object.keys(WIDGET_REGISTRY);

export function getWidgetDefinition(widgetId: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[widgetId];
}

export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter(w => w.category === category);
}
