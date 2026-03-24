import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlan';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; label: string }[];
}

export const ExportButton = ({ data, filename, columns }: ExportButtonProps) => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const { isActive } = useSubscriptionPlan();

  const guardExport = () => {
    if (!isActive) {
      toast({ title: 'Upgrade je pakket om te exporteren', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const exportToCSV = () => {
    if (!guardExport()) return;
    setExporting(true);
    try {
      const headers = columns 
        ? columns.map(c => c.label) 
        : Object.keys(data[0] || {});
      
      const keys = columns 
        ? columns.map(c => c.key) 
        : Object.keys(data[0] || {});

      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          keys.map(key => {
            const value = row[key];
            const strValue = value === null || value === undefined ? '' : String(value);
            return `"${strValue.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Export geslaagd 📊', description: `${data.length} rijen geëxporteerd` });
    } catch {
      toast({ title: 'Export mislukt', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    if (!guardExport()) return;
    setExporting(true);
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Export geslaagd 📊', description: `${data.length} items geëxporteerd` });
    } catch {
      toast({ title: 'Export mislukt', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting || data.length === 0}>
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Exporteren</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          CSV / Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="h-4 w-4 mr-2" />
          JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
