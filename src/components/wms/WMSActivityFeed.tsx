import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  AlertTriangle,
  CheckCircle2,
  Repeat,
  User,
  Scan,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "inbound" | "outbound" | "pick" | "transfer" | "alert" | "scan" | "complete";
  title: string;
  description?: string;
  timestamp: Date;
  user?: string;
  meta?: string;
}

const activityIcons: Record<ActivityItem["type"], ReactNode> = {
  inbound: <ArrowDownToLine className="h-4 w-4" />,
  outbound: <ArrowUpFromLine className="h-4 w-4" />,
  pick: <Package className="h-4 w-4" />,
  transfer: <Repeat className="h-4 w-4" />,
  alert: <AlertTriangle className="h-4 w-4" />,
  scan: <Scan className="h-4 w-4" />,
  complete: <CheckCircle2 className="h-4 w-4" />,
};

const activityColors: Record<ActivityItem["type"], string> = {
  inbound: "bg-emerald-500/15 text-emerald-500",
  outbound: "bg-blue-500/15 text-blue-500",
  pick: "bg-violet-500/15 text-violet-500",
  transfer: "bg-cyan-500/15 text-cyan-500",
  alert: "bg-amber-500/15 text-amber-500",
  scan: "bg-primary/15 text-primary",
  complete: "bg-emerald-500/15 text-emerald-500",
};

interface WMSActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
  maxItems?: number;
}

export function WMSActivityFeed({
  activities,
  className,
  maxItems = 8,
}: WMSActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className={cn("space-y-1", className)}>
      {displayedActivities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="group relative flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {/* Timeline connector */}
          {index < displayedActivities.length - 1 && (
            <div className="absolute left-[1.65rem] top-[2.75rem] w-px h-[calc(100%-1rem)] bg-border/50" />
          )}

          {/* Icon */}
          <div
            className={cn(
              "relative z-10 flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0",
              activityColors[activity.type]
            )}
          >
            {activityIcons[activity.type]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{activity.title}</p>
              {activity.meta && (
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {activity.meta}
                </span>
              )}
            </div>
            {activity.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {activity.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(activity.timestamp, {
                  addSuffix: true,
                  locale: nl,
                })}
              </span>
              {activity.user && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {activity.user}
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {activities.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Geen recente activiteit</p>
        </div>
      )}
    </div>
  );
}

// Returns empty array — activities come from database
export function generateDemoActivities(): ActivityItem[] {
  return [];
}
