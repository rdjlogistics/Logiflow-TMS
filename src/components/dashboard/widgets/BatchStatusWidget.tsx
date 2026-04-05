import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Play, CheckCircle2, AlertTriangle, Clock, Mail, FileText, Fuel } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BatchJob {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  functionName: string;
  schedule: string;
}

const BATCH_JOBS: BatchJob[] = [
  {
    id: 'email-queue',
    name: 'Email Wachtrij',
    description: 'Verwerkt uitstaande emails',
    icon: Mail,
    functionName: 'process-email-queue',
    schedule: 'Elke 2 min',
  },
  {
    id: 'overdue-invoices',
    name: 'Overdue Facturen',
    description: 'Checkt vervallen facturen',
    icon: FileText,
    functionName: 'check-overdue-invoices',
    schedule: 'Dagelijks 07:00',
  },
  {
    id: 'diesel-price',
    name: 'Dieselprijs Update',
    description: 'Werkt brandstofprijzen bij',
    icon: Fuel,
    functionName: 'diesel-price-update',
    schedule: 'Dagelijks 06:00',
  },
];

interface JobStatus {
  running: boolean;
  lastResult: 'success' | 'error' | null;
  lastMessage: string;
}

export default function BatchStatusWidget() {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<Record<string, JobStatus>>({});

  const runJob = useCallback(async (job: BatchJob) => {
    setStatuses(prev => ({
      ...prev,
      [job.id]: { running: true, lastResult: null, lastMessage: 'Bezig...' },
    }));

    try {
      const { data, error } = await supabase.functions.invoke(job.functionName);

      if (error) throw error;

      setStatuses(prev => ({
        ...prev,
        [job.id]: {
          running: false,
          lastResult: 'success',
          lastMessage: JSON.stringify(data).slice(0, 80),
        },
      }));

      toast({ title: `${job.name} voltooid`, description: 'Batch succesvol uitgevoerd' });
    } catch (err: any) {
      setStatuses(prev => ({
        ...prev,
        [job.id]: {
          running: false,
          lastResult: 'error',
          lastMessage: err?.message || 'Onbekende fout',
        },
      }));

      toast({
        title: `${job.name} mislukt`,
        description: err?.message || 'Kon batch niet uitvoeren',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return (
    <Card className="h-full border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          Dagelijkse Batches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {BATCH_JOBS.map(job => {
          const status = statuses[job.id];
          const Icon = job.icon;

          return (
            <div
              key={job.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/30"
            >
              <div className="shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{job.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                    {job.schedule}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {status?.lastMessage || job.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {status?.lastResult === 'success' && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                )}
                {status?.lastResult === 'error' && (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                )}
                {!status?.lastResult && !status?.running && (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-7 w-7", status?.running && "animate-spin")}
                  onClick={() => runJob(job)}
                  disabled={status?.running}
                >
                  <Play className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
