import { useState } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Calendar,
} from "lucide-react";
import { useOrderBulkOperations, ExportOptions } from "@/hooks/useOrderBulkOperations";

interface OrderExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DatePreset = "all" | "today" | "week" | "month" | "last_month" | "custom";

export function OrderExportDialog({ open, onOpenChange }: OrderExportDialogProps) {
  const [format_type, setFormatType] = useState<"xlsx" | "csv">("xlsx");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("all");
  const [includeCompleted, setIncludeCompleted] = useState(true);

  const { exporting, exportOrders } = useOrderBulkOperations();

  const getDateRange = (): { from?: string; to?: string } => {
    const today = new Date();

    switch (datePreset) {
      case "today":
        const todayStr = format(today, "yyyy-MM-dd");
        return { from: todayStr, to: todayStr };
      case "week":
        return {
          from: format(subDays(today, 7), "yyyy-MM-dd"),
          to: format(today, "yyyy-MM-dd"),
        };
      case "month":
        return {
          from: format(startOfMonth(today), "yyyy-MM-dd"),
          to: format(endOfMonth(today), "yyyy-MM-dd"),
        };
      case "last_month":
        const lastMonth = subMonths(today, 1);
        return {
          from: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
          to: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
        };
      case "custom":
        return { from: dateFrom || undefined, to: dateTo || undefined };
      default:
        return {};
    }
  };

  const handleExport = async () => {
    const dateRange = getDateRange();
    
    const options: ExportOptions = {
      format: format_type,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      status: status,
      includeCompleted,
    };

    await exportOrders(options);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Orders Exporteren
          </DialogTitle>
          <DialogDescription>
            Download orders als CSV of Excel bestand
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Bestandsformaat</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={`cursor-pointer transition-all ${
                  format_type === "xlsx"
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setFormatType("xlsx")}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <FileSpreadsheet className={`h-8 w-8 ${format_type === "xlsx" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <p className="font-medium text-sm">Excel</p>
                    <p className="text-xs text-muted-foreground">.xlsx</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  format_type === "csv"
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setFormatType("csv")}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <FileText className={`h-8 w-8 ${format_type === "csv" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <p className="font-medium text-sm">CSV</p>
                    <p className="text-xs text-muted-foreground">.csv</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Periode
            </Label>
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle orders</SelectItem>
                <SelectItem value="today">Vandaag</SelectItem>
                <SelectItem value="week">Afgelopen 7 dagen</SelectItem>
                <SelectItem value="month">Deze maand</SelectItem>
                <SelectItem value="last_month">Vorige maand</SelectItem>
                <SelectItem value="custom">Aangepaste periode</SelectItem>
              </SelectContent>
            </Select>

            {datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Van</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Tot</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="aanvraag">Aanvraag</SelectItem>
                <SelectItem value="gepland">Gepland</SelectItem>
                <SelectItem value="geladen">Geladen</SelectItem>
                <SelectItem value="onderweg">Onderweg</SelectItem>
                <SelectItem value="afgeleverd">Afgeleverd</SelectItem>
                <SelectItem value="afgerond">Afgerond</SelectItem>
                <SelectItem value="gecontroleerd">Gecontroleerd</SelectItem>
                <SelectItem value="gefactureerd">Gefactureerd</SelectItem>
                <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Completed Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Afgeronde orders meenemen</Label>
              <p className="text-xs text-muted-foreground">
                Inclusief afgeronde en geannuleerde orders
              </p>
            </div>
            <Switch
              checked={includeCompleted}
              onCheckedChange={setIncludeCompleted}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporteren...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exporteren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
