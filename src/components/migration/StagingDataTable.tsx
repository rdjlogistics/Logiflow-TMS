import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertTriangle, XCircle, Play, Trash2, Edit, Eye, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface StagingRecord {
  id: string;
  entityType: string;
  status: "READY" | "ERROR" | "DUPLICATE" | "IGNORED" | "IMPORTED";
  data: Record<string, any>;
  errors: string[];
  duplicateOf?: string;
}

interface StagingDataTableProps {
  records: StagingRecord[];
  entityType: string;
  onImport: (recordIds: string[]) => Promise<void>;
  onDelete: (recordIds: string[]) => void;
  onUpdateRecord: (id: string, data: Record<string, any>) => void;
  onRevalidate: () => void;
  isImporting?: boolean;
}

const statusConfig = {
  READY: { 
    label: "Gereed", 
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: CheckCircle2 
  },
  ERROR: { 
    label: "Fout", 
    className: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: XCircle 
  },
  DUPLICATE: { 
    label: "Duplicaat", 
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: AlertTriangle 
  },
  IGNORED: { 
    label: "Genegeerd", 
    className: "bg-muted text-muted-foreground border-border",
    icon: XCircle 
  },
  IMPORTED: { 
    label: "Geïmporteerd", 
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2 
  },
};

export function StagingDataTable({
  records,
  entityType,
  onImport,
  onDelete,
  onUpdateRecord,
  onRevalidate,
  isImporting = false,
}: StagingDataTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<StagingRecord | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [viewingRecord, setViewingRecord] = useState<StagingRecord | null>(null);
  const { toast } = useToast();

  const filteredRecords = filterStatus
    ? records.filter((r) => r.status === filterStatus)
    : records;

  const stats = {
    total: records.length,
    ready: records.filter((r) => r.status === "READY").length,
    error: records.filter((r) => r.status === "ERROR").length,
    duplicate: records.filter((r) => r.status === "DUPLICATE").length,
    imported: records.filter((r) => r.status === "IMPORTED").length,
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const handleImportSelected = async () => {
    const readyIds = Array.from(selectedIds).filter((id) => {
      const record = records.find((r) => r.id === id);
      return record?.status === "READY";
    });

    if (readyIds.length === 0) {
      toast({
        title: "Geen records om te importeren",
        description: "Selecteer records met status 'Gereed'",
        variant: "destructive",
      });
      return;
    }

    await onImport(readyIds);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const openEditDialog = (record: StagingRecord) => {
    setEditingRecord(record);
    setEditData({ ...record.data });
  };

  const saveEdit = () => {
    if (editingRecord) {
      onUpdateRecord(editingRecord.id, editData);
      setEditingRecord(null);
      setEditData({});
    }
  };

  const dataFields = records.length > 0 ? Object.keys(records[0].data) : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Staging Data - {entityType}</CardTitle>
            <CardDescription>
              {stats.total} records • {stats.ready} gereed • {stats.error} fouten • {stats.duplicate} duplicaten
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRevalidate}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Hervalideren
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterStatus === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(null)}
          >
            Alle ({stats.total})
          </Button>
          <Button
            variant={filterStatus === "READY" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("READY")}
            className="text-blue-500"
          >
            Gereed ({stats.ready})
          </Button>
          <Button
            variant={filterStatus === "ERROR" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("ERROR")}
            className="text-red-500"
          >
            Fouten ({stats.error})
          </Button>
          <Button
            variant={filterStatus === "DUPLICATE" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("DUPLICATE")}
            className="text-amber-500"
          >
            Duplicaten ({stats.duplicate})
          </Button>
          <Button
            variant={filterStatus === "IMPORTED" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("IMPORTED")}
            className="text-emerald-500"
          >
            Geïmporteerd ({stats.imported})
          </Button>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selectedIds.size} geselecteerd</span>
            <Button
              size="sm"
              onClick={handleImportSelected}
              disabled={isImporting}
            >
              <Play className="h-4 w-4 mr-2" />
              Importeren
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Verwijderen
            </Button>
          </div>
        )}

        {/* Data table */}
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                {dataFields.slice(0, 4).map((field) => (
                  <TableHead key={field} className="capitalize">
                    {field.replace(/_/g, " ")}
                  </TableHead>
                ))}
                <TableHead>Fouten</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const StatusIcon = statusConfig[record.status]?.icon || CheckCircle2;
                return (
                  <TableRow key={record.id} className={record.status === "IMPORTED" ? "opacity-60" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={() => toggleSelect(record.id)}
                        disabled={record.status === "IMPORTED"}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[record.status]?.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[record.status]?.label}
                      </Badge>
                    </TableCell>
                    {dataFields.slice(0, 4).map((field) => (
                      <TableCell key={field} className="max-w-[150px] truncate">
                        {String(record.data[field] || "-")}
                      </TableCell>
                    ))}
                    <TableCell>
                      {record.errors.length > 0 && (
                        <span className="text-xs text-red-500">
                          {record.errors.length} fout(en)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingRecord(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {record.status !== "IMPORTED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>

      {/* View Dialog */}
      <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Details</DialogTitle>
            <DialogDescription>
              Status: {viewingRecord && statusConfig[viewingRecord.status]?.label}
            </DialogDescription>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(viewingRecord.data).map(([key, value]) => (
                  <div key={key}>
                    <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {String(value || "-")}
                    </p>
                  </div>
                ))}
              </div>
              {viewingRecord.errors.length > 0 && (
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <p className="font-medium text-red-500 mb-2">Fouten:</p>
                  <ul className="list-disc list-inside text-sm text-red-400">
                    {viewingRecord.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Bewerken</DialogTitle>
            <DialogDescription>
              Pas de waarden aan om fouten op te lossen
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="grid grid-cols-2 gap-4 py-4">
              {Object.entries(editData).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                  <Input
                    value={String(value || "")}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>
              Annuleren
            </Button>
            <Button onClick={saveEdit}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
