import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatsCard, StatsGrid } from "@/components/common/StatsCard";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Mail,
  Send,
  Clock,
  AlertTriangle,
  ShieldOff,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type TimeRange = "24h" | "7d" | "30d" | "custom";
type StatusFilter = "all" | "sent" | "pending" | "failed" | "suppressed";

interface EmailLogRow {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, string> = {
  sent: "Verzonden",
  pending: "In wachtrij",
  dlq: "Gefaald",
  failed: "Gefaald",
  suppressed: "Onderdrukt",
  bounced: "Geweigerd",
  complained: "Klacht",
};

const STATUS_BADGE_MAP: Record<string, string> = {
  sent: "betaald",
  pending: "gepland",
  dlq: "geannuleerd",
  failed: "geannuleerd",
  suppressed: "vervallen",
  bounced: "geannuleerd",
  complained: "geannuleerd",
};

function getTimeRangeDate(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

/** Deduplicate by message_id, keeping the latest row per message */
function deduplicateByMessageId(rows: EmailLogRow[]): EmailLogRow[] {
  const map = new Map<string, EmailLogRow>();
  for (const row of rows) {
    const key = row.message_id || row.id;
    const existing = map.get(key);
    if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
      map.set(key, row);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default function EmailDashboard() {
  usePageTitle("E-mail Dashboard");

  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fromDate = useMemo(() => {
    if (timeRange === "custom" && customFrom) return customFrom;
    return getTimeRangeDate(timeRange);
  }, [timeRange, customFrom]);

  const toDate = useMemo(() => {
    if (timeRange === "custom" && customTo) return customTo;
    return new Date();
  }, [timeRange, customTo]);

  // Fetch all logs within range (we deduplicate client-side)
  const { data: rawLogs, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["email-logs", fromDate.toISOString(), toDate.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("email_send_log")
        .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as EmailLogRow[];
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  // Deduplicated logs
  const dedupedLogs = useMemo(() => deduplicateByMessageId(rawLogs ?? []), [rawLogs]);

  // Template names for filter
  const templateNames = useMemo(() => {
    const names = new Set<string>();
    dedupedLogs.forEach((l) => l.template_name && names.add(l.template_name));
    return Array.from(names).sort();
  }, [dedupedLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return dedupedLogs.filter((log) => {
      if (statusFilter !== "all") {
        if (statusFilter === "failed" && log.status !== "dlq" && log.status !== "failed") return false;
        if (statusFilter === "sent" && log.status !== "sent") return false;
        if (statusFilter === "pending" && log.status !== "pending") return false;
        if (statusFilter === "suppressed" && log.status !== "suppressed") return false;
      }
      if (templateFilter !== "all" && log.template_name !== templateFilter) return false;
      return true;
    });
  }, [dedupedLogs, statusFilter, templateFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = dedupedLogs.length;
    const sent = dedupedLogs.filter((l) => l.status === "sent").length;
    const pending = dedupedLogs.filter((l) => l.status === "pending").length;
    const failed = dedupedLogs.filter((l) => l.status === "dlq" || l.status === "failed").length;
    const suppressed = dedupedLogs.filter((l) => l.status === "suppressed").length;
    return { total, sent, pending, failed, suppressed };
  }, [dedupedLogs]);

  // Pagination
  const pagination = usePagination({ total: filteredLogs.length, pageSize: 50 });
  const paginatedLogs = pagination.paginate(filteredLogs);

  // Reset page when filters change
  useEffect(() => { pagination.firstPage(); }, [statusFilter, templateFilter, timeRange]);

  return (
    <DashboardLayout title="E-mail Dashboard" description="Overzicht van alle verzonden e-mails">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Stats Cards */}
        <StatsGrid cols={5}>
          <StatsCard title="Totaal" value={stats.total} icon={Mail} loading={isLoading} />
          <StatsCard title="Verzonden" value={stats.sent} icon={Send} loading={isLoading}
            iconClassName="bg-emerald-500/10" valueClassName="text-emerald-500" />
          <StatsCard title="In wachtrij" value={stats.pending} icon={Clock} loading={isLoading}
            iconClassName="bg-amber-500/10" valueClassName="text-amber-500" />
          <StatsCard title="Gefaald" value={stats.failed} icon={AlertTriangle} loading={isLoading}
            iconClassName="bg-red-500/10" valueClassName="text-red-500" />
          <StatsCard title="Onderdrukt" value={stats.suppressed} icon={ShieldOff} loading={isLoading}
            iconClassName="bg-orange-500/10" valueClassName="text-orange-500" />
        </StatsGrid>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Time range buttons */}
              <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
                {([["24h", "24 uur"], ["7d", "7 dagen"], ["30d", "30 dagen"]] as const).map(([val, label]) => (
                  <Button
                    key={val}
                    variant={timeRange === val ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimeRange(val)}
                    className="text-xs"
                  >
                    {label}
                  </Button>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={timeRange === "custom" ? "default" : "ghost"} size="sm" className="text-xs gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Custom
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={customFrom && customTo ? { from: customFrom, to: customTo } : undefined}
                      onSelect={(range) => {
                        if (range?.from) setCustomFrom(range.from);
                        if (range?.to) setCustomTo(range.to);
                        if (range?.from && range?.to) setTimeRange("custom");
                      }}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="sent">Verzonden</SelectItem>
                  <SelectItem value="pending">In wachtrij</SelectItem>
                  <SelectItem value="failed">Gefaald</SelectItem>
                  <SelectItem value="suppressed">Onderdrukt</SelectItem>
                </SelectContent>
              </Select>

              {/* Template filter */}
              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle templates</SelectItem>
                  {templateNames.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="text-xs gap-1"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", autoRefresh && "animate-spin")} />
                  Auto
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs gap-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Vernieuwen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Log Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Ontvanger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tijdstip</TableHead>
                  <TableHead>Foutmelding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Geen e-mails gevonden</p>
                      <p className="text-sm mt-1">Pas de filters aan om resultaten te zien</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">
                        {log.template_name || <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {log.recipient_email || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={STATUS_BADGE_MAP[log.status ?? ""] ?? "neutral"} variant="pill" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM HH:mm", { locale: nl })}
                      </TableCell>
                      <TableCell className="text-sm text-red-400 max-w-[250px] truncate">
                        {log.error_message || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {filteredLogs.length > 50 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                <p className="text-sm text-muted-foreground">
                  {pagination.from}–{pagination.to} van {pagination.total}
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => pagination.prevPage()}
                        className={cn(!pagination.hasPrev && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
                      const page = i + 1;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={pagination.page === page}
                            onClick={() => pagination.setPage(page)}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => pagination.nextPage()}
                        className={cn(!pagination.hasNext && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last updated */}
        {dataUpdatedAt && (
          <p className="text-xs text-muted-foreground text-right">
            Laatst bijgewerkt: {format(new Date(dataUpdatedAt), "HH:mm:ss")}
          </p>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
