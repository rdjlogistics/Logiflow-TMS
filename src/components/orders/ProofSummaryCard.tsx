import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, Truck, Timer, MessageSquare, User } from "lucide-react";
import { useOrderSubstatuses } from "@/hooks/useOrderSubstatuses";

interface StopWithProof {
  id: string;
  stop_order: number;
  stop_type: string;
  company_name: string | null;
  city: string | null;
  proof?: {
    sub_status: string | null;
    loading_minutes: number | null;
    waiting_minutes: number | null;
    actual_distance_km: number | null;
    receiver_first_name: string | null;
    receiver_last_name: string | null;
    note: string | null;
  } | null;
}

interface ProofSummaryCardProps {
  stops: StopWithProof[];
}

const ProofSummaryCard = ({ stops }: ProofSummaryCardProps) => {
  const { data: substatuses } = useOrderSubstatuses();

  const stopsWithProof = stops.filter(s => s.proof);
  if (stopsWithProof.length === 0) return null;

  const totals = stopsWithProof.reduce(
    (acc, s) => ({
      loading: acc.loading + (s.proof?.loading_minutes || 0),
      waiting: acc.waiting + (s.proof?.waiting_minutes || 0),
      distance: acc.distance + (s.proof?.actual_distance_km || 0),
    }),
    { loading: 0, waiting: 0, distance: 0 }
  );

  const getSubstatusColor = (name: string | null) => {
    if (!name || !substatuses) return undefined;
    const found = substatuses.find(s => s.name === name);
    return found?.color || undefined;
  };

  const truncate = (text: string | null, max = 40) => {
    if (!text) return "-";
    return text.length > max ? text.slice(0, max) + "…" : text;
  };

  const receiverName = (proof: StopWithProof["proof"]) => {
    if (!proof) return "-";
    const name = [proof.receiver_first_name, proof.receiver_last_name].filter(Boolean).join(" ");
    return name || "-";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Afleveroverzicht
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-semibold">Stop</th>
                <th className="text-left px-4 py-2 font-semibold">Substatus</th>
                <th className="text-right px-4 py-2 font-semibold">
                  <span className="flex items-center justify-end gap-1"><Timer className="h-3 w-3" />Laadtijd</span>
                </th>
                <th className="text-right px-4 py-2 font-semibold">
                  <span className="flex items-center justify-end gap-1"><Clock className="h-3 w-3" />Wachttijd</span>
                </th>
                <th className="text-right px-4 py-2 font-semibold">
                  <span className="flex items-center justify-end gap-1"><Truck className="h-3 w-3" />Afstand</span>
                </th>
                <th className="text-left px-4 py-2 font-semibold">Ontvanger</th>
                <th className="text-left px-4 py-2 font-semibold">Opmerking</th>
              </tr>
            </thead>
            <tbody>
              {stopsWithProof.map((stop) => {
                const color = getSubstatusColor(stop.proof?.sub_status ?? null);
                return (
                  <tr key={stop.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">
                      <span className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${stop.stop_type === 'pickup' ? 'bg-orange-500' : 'bg-green-500'}`}>
                          {stop.stop_order}
                        </span>
                        {stop.company_name || stop.city || `Stop ${stop.stop_order}`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {stop.proof?.sub_status ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 font-semibold"
                          style={color ? { borderColor: color, color: color } : undefined}
                        >
                          {stop.proof.sub_status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {stop.proof?.loading_minutes ? `${stop.proof.loading_minutes} min` : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {stop.proof?.waiting_minutes ? `${stop.proof.waiting_minutes} min` : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {stop.proof?.actual_distance_km ? `${stop.proof.actual_distance_km} km` : "-"}
                    </td>
                    <td className="px-4 py-2.5">{receiverName(stop.proof)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">
                      {truncate(stop.proof?.note ?? null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold text-sm">
                <td className="px-4 py-2.5" colSpan={2}>Totaal</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{totals.loading > 0 ? `${totals.loading} min` : "-"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{totals.waiting > 0 ? `${totals.waiting} min` : "-"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{totals.distance > 0 ? `${totals.distance} km` : "-"}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <div className="md:hidden divide-y divide-border/30">
          {stopsWithProof.map((stop) => {
            const color = getSubstatusColor(stop.proof?.sub_status ?? null);
            return (
              <div key={stop.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-sm">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${stop.stop_type === 'pickup' ? 'bg-orange-500' : 'bg-green-500'}`}>
                      {stop.stop_order}
                    </span>
                    {stop.company_name || stop.city || `Stop ${stop.stop_order}`}
                  </span>
                  {stop.proof?.sub_status && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 font-semibold"
                      style={color ? { borderColor: color, color: color } : undefined}
                    >
                      {stop.proof.sub_status}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    <span>{stop.proof?.loading_minutes ? `${stop.proof.loading_minutes} min` : "-"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{stop.proof?.waiting_minutes ? `${stop.proof.waiting_minutes} min` : "-"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    <span>{stop.proof?.actual_distance_km ? `${stop.proof.actual_distance_km} km` : "-"}</span>
                  </div>
                </div>
                {(receiverName(stop.proof) !== "-" || (stop.proof?.note)) && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {receiverName(stop.proof) !== "-" && (
                      <p className="flex items-center gap-1"><User className="h-3 w-3" />{receiverName(stop.proof)}</p>
                    )}
                    {stop.proof?.note && (
                      <p className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{truncate(stop.proof.note, 60)}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {/* Mobile totals */}
          <div className="px-4 py-3 bg-muted/50">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Totaal</span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{totals.loading > 0 ? `${totals.loading} min` : "-"}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{totals.waiting > 0 ? `${totals.waiting} min` : "-"}</span>
                <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{totals.distance > 0 ? `${totals.distance} km` : "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProofSummaryCard;
