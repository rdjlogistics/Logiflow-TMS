import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, CheckCircle, XCircle, Copy, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  endpoint: string;
  status: string;
  duration: string;
  payload: string;
}

interface LogDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: LogEntry | null;
  onRetry?: (log: LogEntry) => void;
}

export function LogDetailDialog({ open, onOpenChange, log, onRetry }: LogDetailDialogProps) {
  if (!log) return null;

  const mockRequestDetails = {
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": log.id
    },
    body: log.type === "Webhook" ? {
      event: log.endpoint,
      data: log.payload ? JSON.parse(log.payload) : null
    } : null,
    response: log.status === "success" 
      ? { status: 200, message: "OK", data: log.payload }
      : { status: 500, error: log.payload }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(mockRequestDetails, null, 2));
    toast({ title: "Gekopieerd ✓", description: "Log details zijn gekopieerd naar klembord." });
  };

  const handleRetry = () => {
    onRetry?.(log);
    toast({ 
      title: "Retry gestart", 
      description: `Request naar ${log.endpoint} wordt opnieuw uitgevoerd.` 
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Log Details - {log.id}
          </DialogTitle>
          <DialogDescription>
            {log.timestamp}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status row */}
          <div className="flex items-center gap-4">
            {log.status === "success" ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                <CheckCircle className="h-3 w-3 mr-1" /> Success
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">
                <XCircle className="h-3 w-3 mr-1" /> Failed
              </Badge>
            )}
            <Badge variant="outline">{log.type}</Badge>
            <span className="text-sm text-muted-foreground">Duration: {log.duration}</span>
          </div>

          {/* Endpoint */}
          <div className="p-3 border rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Endpoint</p>
            <p className="font-mono text-sm">{log.endpoint}</p>
          </div>

          {/* Request/Response */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Request & Response</p>
            <ScrollArea className="h-[200px] border rounded-lg">
              <pre className="p-4 text-xs font-mono">
                {JSON.stringify(mockRequestDetails, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Kopieer
          </Button>
          {log.status === "failed" && (
            <Button onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Request
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Sluiten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
