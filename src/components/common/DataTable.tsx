import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from "lucide-react";
import { EmptyState } from "./EmptyState";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T extends { id?: string | number }> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Keys to search across */
  searchKeys?: (keyof T | string)[];
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  className?: string;
}

type SortDir = 'asc' | 'desc' | null;

function getNestedValue<T>(obj: T, key: string): unknown {
  return (key as string).split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  loading = false,
  searchable = false,
  searchPlaceholder = 'Zoeken...',
  searchKeys,
  onRowClick,
  rowClassName,
  emptyTitle = 'Geen gegevens',
  emptyDescription,
  pageSize = 50,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    const keys = searchKeys ?? columns.map(c => c.key as string);
    return data.filter(row =>
      keys.some(k => {
        const v = getNestedValue(row, k as string);
        return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = getNestedValue(a, sortKey) ?? '';
      const bv = getNestedValue(b, sortKey) ?? '';
      const cmp = String(av).localeCompare(String(bv), 'nl', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function SortIcon({ col }: { col: DataTableColumn<T> }) {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 ml-1 inline" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3.5 w-3.5 ml-1 inline" />;
    if (sortDir === 'desc') return <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 ml-1 inline" />;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead
                  key={col.key as string}
                  className={cn(col.headerClassName, col.sortable && 'cursor-pointer select-none hover:bg-muted/50')}
                  onClick={() => col.sortable && handleSort(col.key as string)}
                >
                  {col.header}
                  <SortIcon col={col} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState title={emptyTitle} description={emptyDescription} size="sm" />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, i) => (
                <TableRow
                  key={row.id ?? i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-muted/50',
                    rowClassName?.(row),
                  )}
                >
                  {columns.map(col => (
                    <TableCell key={col.key as string} className={col.className}>
                      {col.cell
                        ? col.cell(row)
                        : (() => {
                            const v = getNestedValue(row, col.key as string);
                            return v === null || v === undefined ? '—' : String(v);
                          })()
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{sorted.length} resultaten</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Vorige
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Volgende
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
