import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Download, CheckCircle, XCircle, Clock, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TenderInviteRow {
  id: string;
  status: string;
  offered_price: number | null;
  responded_at: string | null;
  created_at: string;
  carriers: { company_name: string } | null;
  tender_sessions: { 
    title: string | null;
    trip_id: string | null;
    trips: { order_number: string | null } | null;
  } | null;
}

type StatusConfig = {
  label: string;
  variant: "default" | "secondary" | "destructive";
  icon: ReactNode;
};

const statusConfig: Record<string, StatusConfig> = {
  accepted: { label: "Geaccepteerd", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  declined: { label: "Afgewezen", variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Verlopen", variant: "destructive", icon: <Clock className="h-3 w-3" /> },
  pending: { label: "Wachtend", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  pending_response: { label: "Wachtend", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
};

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const s = String(value ?? "");
    if (/[\n\r\t,\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`;
    return s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatResponseTime(createdAt: string, respondedAt: string | null): string {
  if (!respondedAt) return "-";
  const diff = new Date(respondedAt).getTime() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

const TenderHistory = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [carrierFilter, setCarrierFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<TenderInviteRow | null>(null);

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['tender-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tender_invites')
        .select(`
          id, status, offered_price, responded_at, created_at,
          carriers (company_name),
          tender_sessions (title, trip_id, trips:trip_id (order_number))
        `)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as TenderInviteRow[];
    },
  });

  const uniqueCarriers = useMemo(() => {
    const names = invites.map(i => (i.carriers as any)?.company_name).filter(Boolean);
    return [...new Set(names)] as string[];
  }, [invites]);

  const filteredHistory = useMemo(() => {
    return invites.filter((item) => {
      const carrierName = (item.carriers as any)?.company_name ?? '';
      const tenderTitle = (item.tender_sessions as any)?.title ?? '';
      const orderNumber = (item.tender_sessions as any)?.trips?.order_number ?? '';
      const matchesSearch =
        tenderTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carrierName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesCarrier = carrierFilter === "all" || carrierName === carrierFilter;
      return matchesSearch && matchesStatus && matchesCarrier;
    });
  }, [invites, searchTerm, statusFilter, carrierFilter]);

  const stats = {
    totalInvites: invites.length,
    accepted: invites.filter((h) => h.status === "accepted").length,
    declined: invites.filter((h) => h.status === "declined").length,
    expired: invites.filter((h) => h.status === "expired").length,
  };

  const handleExport = () => {
    downloadCsv(
      `tender-history_${new Date().toISOString().slice(0, 10)}.csv`,
      filteredHistory.map((row) => ({
        tender: (row.tender_sessions as any)?.title ?? '',
        order_number: (row.tender_sessions as any)?.trips?.order_number ?? '',
        carrier: (row.carriers as any)?.company_name ?? '',
        status: row.status,
        offered_price: row.offered_price ?? "",
        response_time: formatResponseTime(row.created_at, row.responded_at),
        invited_at: row.created_at,
        responded_at: row.responded_at ?? "",
      }))
    );
    toast.success("Export voltooid", { description: `${filteredHistory.length} records geëxporteerd naar CSV` });
  };

  return (
    <DashboardLayout title="Acceptatiehistorie">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.totalInvites}</div>
              <p className="text-xs text-muted-foreground">Totaal Invites</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-emerald-600">{stats.accepted}</div>
              <p className="text-xs text-muted-foreground">Geaccepteerd</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-muted-foreground">{stats.declined}</div>
              <p className="text-xs text-muted-foreground">Afgewezen</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
              <p className="text-xs text-muted-foreground">Verlopen</p>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle>Tender Reacties</CardTitle>
                <CardDescription>Historisch overzicht van alle tender reacties</CardDescription>
              </div>
              <Button variant="outline" onClick={handleExport} disabled={filteredHistory.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exporteer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op tender, order of carrier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="accepted">Geaccepteerd</SelectItem>
                  <SelectItem value="declined">Afgewezen</SelectItem>
                  <SelectItem value="expired">Verlopen</SelectItem>
                </SelectContent>
              </Select>
              {uniqueCarriers.length > 0 && (
                <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Carriers</SelectItem>
                    {uniqueCarriers.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tender</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bod</TableHead>
                      <TableHead>Reactietijd</TableHead>
                      <TableHead>Uitgenodigd</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Geen tender reacties gevonden
                        </TableCell>
                      </TableRow>
                    ) : filteredHistory.map((item) => {
                      const config = statusConfig[item.status] ?? statusConfig.pending;
                      const carrierName = (item.carriers as any)?.company_name ?? '—';
                      const tenderTitle = (item.tender_sessions as any)?.title ?? '—';
                      const orderNumber = (item.tender_sessions as any)?.trips?.order_number ?? '—';
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{tenderTitle}</TableCell>
                          <TableCell><Badge variant="outline">{orderNumber}</Badge></TableCell>
                          <TableCell>{carrierName}</TableCell>
                          <TableCell>
                            <Badge variant={config.variant} className="gap-1">
                              {config.icon}{config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.offered_price ? <span className="font-medium">€{item.offered_price}</span> : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>{formatResponseTime(item.created_at, item.responded_at)}</TableCell>
                          <TableCell>
                            {new Date(item.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Sheet */}
        <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{(selectedItem?.tender_sessions as any)?.title ?? 'Tender'}</SheetTitle>
              <SheetDescription>Reactie van {(selectedItem?.carriers as any)?.company_name ?? '—'}</SheetDescription>
            </SheetHeader>
            {selectedItem && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order</p>
                    <p className="font-medium">{(selectedItem.tender_sessions as any)?.trips?.order_number ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={statusConfig[selectedItem.status]?.variant ?? 'secondary'} className="mt-1 gap-1">
                      {statusConfig[selectedItem.status]?.icon}
                      {statusConfig[selectedItem.status]?.label ?? selectedItem.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Carrier</p>
                    <p className="font-medium">{(selectedItem.carriers as any)?.company_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reactietijd</p>
                    <p className="font-medium">{formatResponseTime(selectedItem.created_at, selectedItem.responded_at)}</p>
                  </div>
                </div>

                {selectedItem.offered_price && (
                  <div className="p-4 rounded-lg bg-primary/5 border">
                    <p className="text-sm text-muted-foreground">Geboden Prijs</p>
                    <p className="text-2xl font-bold">€{selectedItem.offered_price}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" onClick={() => {
                    const orderNum = (selectedItem.tender_sessions as any)?.trips?.order_number;
                    if (orderNum) navigate(`/orders?search=${orderNum}`);
                  >
                    Bekijk Order
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default TenderHistory;
