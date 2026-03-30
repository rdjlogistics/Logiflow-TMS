import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { writeExcelFile, writeCsvFile } from '@/lib/excelUtils';
import { useToast } from '@/hooks/use-toast';

interface ExportDropdownProps {
  headers: string[];
  rows: unknown[][];
  filename: string;
  sheetName?: string;
  /** Variant for the trigger button */
  variant?: 'default' | 'outline' | 'ghost';
  /** Size for the trigger button */
  size?: 'default' | 'sm' | 'icon';
  /** Show label or icon only */
  iconOnly?: boolean;
  className?: string;
}

export function ExportDropdown({
  headers,
  rows,
  filename,
  sheetName = 'Data',
  variant = 'outline',
  size = 'default',
  iconOnly = false,
  className,
}: ExportDropdownProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const datestamp = new Date().toISOString().slice(0, 10);

  const handleExcel = async () => {
    if (rows.length === 0) {
      toast({ title: 'Geen data om te exporteren', variant: 'destructive' });
      return;
    }
    setExporting(true);
    try {
      const data = rows.map(row => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
        return obj;
      });
      await writeExcelFile(data, `${filename}_${datestamp}.xlsx`, sheetName);
      toast({ title: 'Excel gedownload', description: `${rows.length} rij(en) geëxporteerd` });
    } catch {
      toast({ title: 'Export mislukt', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleCsv = () => {
    if (rows.length === 0) {
      toast({ title: 'Geen data om te exporteren', variant: 'destructive' });
      return;
    }
    const data = rows.map(row => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });
    writeCsvFile(data, `${filename}_${datestamp}.csv`);
    toast({ title: 'CSV gedownload', description: `${rows.length} rij(en) geëxporteerd` });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {!iconOnly && <span className="ml-2">Exporteer</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCsv} className="gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
