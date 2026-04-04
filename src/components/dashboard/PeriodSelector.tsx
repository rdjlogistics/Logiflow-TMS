import { useMemo } from "react";
import { format, startOfMonth, subMonths, subWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PeriodKey = "this_month" | "last_month" | "3_months" | "6_months" | "this_year";

export interface PeriodOption {
  key: PeriodKey;
  label: string;
  shortLabel: string;
  start: Date;
}

export function getPeriodRange(key: PeriodKey): { start: Date; label: string; shortLabel: string } {
  const now = new Date();
  switch (key) {
    case "this_month":
      return {
        start: startOfMonth(now),
        label: `Deze maand (${format(now, "MMMM", { locale: nl })})`,
        shortLabel: format(now, "MMM", { locale: nl }),
      };
    case "last_month": {
      const prev = subMonths(now, 1);
      return {
        start: startOfMonth(prev),
        label: `Vorige maand (${format(prev, "MMMM", { locale: nl })})`,
        shortLabel: format(prev, "MMM", { locale: nl }),
      };
    }
    case "3_months":
      return {
        start: startOfMonth(subMonths(now, 2)),
        label: "Laatste 3 maanden",
        shortLabel: "3 mnd",
      };
    case "6_months":
      return {
        start: startOfMonth(subMonths(now, 5)),
        label: "Laatste 6 maanden",
        shortLabel: "6 mnd",
      };
    case "this_year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        label: `Heel ${now.getFullYear()}`,
        shortLabel: `${now.getFullYear()}`,
      };
  }
}

interface PeriodSelectorProps {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  className?: string;
}

const PERIODS: { key: PeriodKey; getLabel: () => string }[] = [
  { key: "this_month", getLabel: () => `Deze maand` },
  { key: "last_month", getLabel: () => `Vorige maand` },
  { key: "3_months", getLabel: () => "3 maanden" },
  { key: "6_months", getLabel: () => "6 maanden" },
  { key: "this_year", getLabel: () => `${new Date().getFullYear()}` },
];

export default function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const currentPeriod = useMemo(() => getPeriodRange(value), [value]);

  return (
    <>
      {/* Mobile: pill-style segmented control */}
      <div className={cn("flex sm:hidden", className)}>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/30">
          {PERIODS.slice(0, 4).map((p) => (
            <button
              key={p.key}
              onClick={() => onChange(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all touch-manipulation",
                value === p.key
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              {getPeriodRange(p.key).shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: elegant select */}
      <div className={cn("hidden sm:block", className)}>
        <Select value={value} onValueChange={(v) => onChange(v as PeriodKey)}>
          <SelectTrigger className="w-auto min-w-[180px] h-10 gap-2 rounded-xl bg-muted/30 backdrop-blur-sm border-border/40 hover:bg-muted/50 transition-colors">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue>{currentPeriod.label}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/50 backdrop-blur-xl bg-popover/95">
            {PERIODS.map((p) => (
              <SelectItem key={p.key} value={p.key} className="rounded-lg">
                {getPeriodRange(p.key).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
