import React, { memo, useCallback, Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import WidgetWrapper from "./widgets/WidgetWrapper";
import { WidgetSize, getWidgetDefinition } from "./widgets/WidgetRegistry";
import { Skeleton } from "@/components/ui/skeleton";
import LazyWidget from "./LazyWidget";

// Critical widgets - load immediately
import ActionQueue from "./ActionQueue";
import FinanceSnapshot from "./FinanceSnapshot";
import AlertsWidget from "./AlertsWidget";
import QuickLinksWidget from "./widgets/QuickLinksWidget";

// Lazy load heavy widgets (charts, maps, etc.)
const SmartInsightsWidget = lazyWithRetry(() => import("./SmartInsightsWidget").then(m => ({ default: m.SmartInsightsWidget })));
const FuelStationsWidget = lazyWithRetry(() => import("./FuelStationsWidget").then(m => ({ default: m.FuelStationsWidget })));
const RecentActivityFeed = lazyWithRetry(() => import("./RecentActivityFeed"));
const RevenueChart = lazyWithRetry(() => import("./RevenueChart"));
const TripStatsChart = lazyWithRetry(() => import("./TripStatsChart"));
const FleetMapWidget = lazyWithRetry(() => import("./FleetMapWidget"));
const PerformanceMetricsWidget = lazyWithRetry(() => import("./PerformanceMetricsWidget"));
const GeographicHeatmapWidget = lazyWithRetry(() => import("./GeographicHeatmapWidget"));
const TrendsWidget = lazyWithRetry(() => import("./TrendsWidget"));
const ExecutivePLWidget = lazyWithRetry(() => import("./ExecutivePLWidget"));
const AIDispatchPanel = lazyWithRetry(() => import("../dispatch/AIDispatchPanel"));
const CreditHealthWidget = lazyWithRetry(() => import("./CreditHealthWidget"));
const LiveEventStreamWidget = lazyWithRetry(() => import("./LiveEventStreamWidget"));
const AIUsageWidget = lazyWithRetry(() => import("./AIUsageWidget"));

// Widget loading skeleton
const WidgetSkeleton = () => (
  <div className="p-4 space-y-3">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-24 w-full" />
  </div>
);

export interface WidgetConfig {
  id: string;
  size: WidgetSize;
}

interface DraggableWidgetGridProps {
  widgets: WidgetConfig[];
  isEditing: boolean;
  onReorder: (newOrder: WidgetConfig[]) => void;
  onRemove: (widgetId: string) => void;
  onResize: (widgetId: string, newSize: WidgetSize) => void;
  // Data props
  actionQueue?: any[];
  financeStats?: any;
  revenueData?: any[];
  tripStatusData?: any[];
  weeklyTripsData?: any[];
  loading?: boolean;
  hasEnoughData?: boolean;
}

// Mobile-priority widget order (most actionable first)
const MOBILE_PRIORITY_WIDGETS = [
  'action-queue',
  'ai-dispatch',
  'alerts-widget',
  'executive-pl',
  'performance-metrics',
  'finance-snapshot',
  'fleet-map',
  'smart-insights',
  'trends-widget',
  'geographic-heatmap',
];

const DraggableWidgetGrid = ({
  widgets,
  isEditing,
  onReorder,
  onRemove,
  onResize,
  actionQueue = [],
  financeStats = {},
  revenueData = [],
  tripStatusData = [],
  weeklyTripsData = [],
  loading = false,
  hasEnoughData = false,
}: DraggableWidgetGridProps) => {
  
  const renderWidget = useCallback((widgetId: string) => {
    // Non-lazy widgets (critical path)
    switch (widgetId) {
      case 'action-queue':
        return <ActionQueue actions={actionQueue} loading={loading} />;
      case 'finance-snapshot':
        return (
          <FinanceSnapshot
            openstaand={financeStats.openstaand || 0}
            openFacturen={financeStats.openFacturen || 0}
            payoutsGepland={financeStats.payoutsGepland || 0}
            cashRunway={financeStats.cashRunway || 0}
            readyToInvoice={financeStats.readyToInvoice || 0}
            loading={loading}
          />
        );
      case 'alerts-widget':
        return <AlertsWidget />;
      case 'quick-links':
        return <QuickLinksWidget />;
    }

    // Lazy-loaded widgets wrapped in Suspense
    const lazyContent = (() => {
      switch (widgetId) {
        case 'smart-insights':
          return <SmartInsightsWidget />;
        case 'fuel-stations':
          return <FuelStationsWidget />;
        case 'activity-feed':
          return <RecentActivityFeed loading={loading} />;
        case 'revenue-chart':
          return hasEnoughData ? <RevenueChart data={revenueData} loading={loading} /> : null;
        case 'trip-stats':
          return hasEnoughData ? (
            <TripStatsChart 
              statusData={tripStatusData} 
              weeklyData={weeklyTripsData} 
              loading={loading} 
            />
          ) : null;
        case 'fleet-map':
          return <FleetMapWidget />;
        case 'performance-metrics':
          return <PerformanceMetricsWidget />;
        case 'geographic-heatmap':
          return <GeographicHeatmapWidget />;
        case 'trends-widget':
          return <TrendsWidget />;
        case 'executive-pl':
          return <ExecutivePLWidget />;
        case 'ai-dispatch':
          return <AIDispatchPanel />;
        case 'credit-health':
          return <CreditHealthWidget />;
        case 'live-events':
          return <LiveEventStreamWidget />;
        default:
          return null;
      }
    })();

    if (!lazyContent) return null;

    return (
      <LazyWidget>
        <Suspense fallback={<WidgetSkeleton />}>
          {lazyContent}
        </Suspense>
      </LazyWidget>
    );
  }, [actionQueue, financeStats, revenueData, tripStatusData, weeklyTripsData, loading, hasEnoughData]);

  // Sort widgets by mobile priority for smaller screens
  const getSortedWidgets = () => {
    return [...widgets].sort((a, b) => {
      const aPriority = MOBILE_PRIORITY_WIDGETS.indexOf(a.id);
      const bPriority = MOBILE_PRIORITY_WIDGETS.indexOf(b.id);
      // Keep original order if not in priority list
      if (aPriority === -1 && bPriority === -1) return 0;
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    });
  };

  const handleReorder = (newOrder: WidgetConfig[]) => {
    onReorder(newOrder);
  };

  // Determine widget size for mobile
  const getMobileSize = (widget: WidgetConfig): 'compact' | 'full' => {
    const definition = getWidgetDefinition(widget.id);
    // Large/full widgets remain full on mobile, others are compact
    if (widget.size === 'large' || widget.size === 'full') return 'full';
    // Map widget always full
    if (widget.id === 'fleet-map') return 'full';
    return 'compact';
  };

  if (isEditing) {
    return (
      <Reorder.Group
        axis="y"
        values={widgets}
        onReorder={handleReorder}
        className={cn(
          "grid gap-3 sm:gap-4",
          "grid-cols-1 lg:grid-cols-2"
        )}
      >
        <AnimatePresence>
          {widgets.map((widget) => {
            const content = renderWidget(widget.id);
            if (!content) return null;
            
            return (
              <Reorder.Item
                key={widget.id}
                value={widget}
                className="cursor-grab active:cursor-grabbing"
              >
                <WidgetWrapper
                  widgetId={widget.id}
                  size={widget.size}
                  isEditing={isEditing}
                  onRemove={() => onRemove(widget.id)}
                  onResize={(newSize) => onResize(widget.id, newSize)}
                >
                  {content}
                </WidgetWrapper>
              </Reorder.Item>
            );
          })}
        </AnimatePresence>
      </Reorder.Group>
    );
  }

  // Use mobile-sorted widgets for display
  const sortedWidgets = getSortedWidgets();

  return (
    <motion.div
      layout
      className={cn(
        "grid gap-2.5 sm:gap-4 lg:gap-6",
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
      )}
    >
      <AnimatePresence>
        {sortedWidgets.map((widget) => {
          const content = renderWidget(widget.id);
          if (!content) return null;
          const mobileSize = getMobileSize(widget);
          
          return (
            <WidgetWrapper
              key={widget.id}
              widgetId={widget.id}
              size={widget.size}
              mobileSize={mobileSize}
              isEditing={false}
            >
              {content}
            </WidgetWrapper>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

export default memo(DraggableWidgetGrid);
