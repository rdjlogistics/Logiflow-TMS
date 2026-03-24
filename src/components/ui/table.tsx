import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================
// Premium Table with Sticky Headers & Variants
// ============================================

const tableVariants = cva("w-full caption-bottom text-sm", {
  variants: {
    variant: {
      default: "",
      premium: [
        "[&_thead]:bg-muted/50 [&_thead]:backdrop-blur-sm",
        "[&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150",
        "[&_tbody_tr:hover]:bg-primary/5",
      ],
      striped: [
        "[&_tbody_tr:nth-child(even)]:bg-muted/30",
        "[&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150",
        "[&_tbody_tr:hover]:bg-primary/5",
      ],
      bordered: [
        "border border-border rounded-xl overflow-hidden",
        "[&_th]:border-r [&_th:last-child]:border-r-0",
        "[&_td]:border-r [&_td:last-child]:border-r-0",
      ],
      compact: "[&_th]:py-2 [&_td]:py-2 [&_th]:px-3 [&_td]:px-3 text-xs",
    },
    stickyHeader: {
      true: "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card/95 [&_thead]:backdrop-blur-xl [&_thead]:shadow-sm",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    stickyHeader: false,
  },
});

export interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  containerClassName?: string;
  maxHeight?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, stickyHeader, containerClassName, maxHeight, ...props }, ref) => (
    <div 
      className={cn(
        "relative w-full overflow-auto rounded-xl",
        stickyHeader && maxHeight && `max-h-[${maxHeight}]`,
        containerClassName
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table
        ref={ref} 
        className={cn("min-w-full", tableVariants({ variant, stickyHeader }), className)} 
        {...props} 
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement, 
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn(
      "[&_tr]:border-b [&_tr]:border-border/50",
      className
    )} 
    {...props} 
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement, 
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody 
    ref={ref} 
    className={cn("[&_tr:last-child]:border-0", className)} 
    {...props} 
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement, 
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot 
    ref={ref} 
    className={cn(
      "border-t border-border/50 bg-muted/30 font-medium [&>tr]:last:border-b-0",
      className
    )} 
    {...props} 
  />
));
TableFooter.displayName = "TableFooter";

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isSelected?: boolean;
  isClickable?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, isSelected, isClickable, ...props }, ref) => (
    <tr
      ref={ref}
      data-state={isSelected ? "selected" : undefined}
      className={cn(
        "border-b border-border/30 transition-colors duration-100",
        "hover:bg-muted/50",
        "data-[state=selected]:bg-primary/10 data-[state=selected]:border-primary/20",
        isClickable && "cursor-pointer active:bg-muted/70",
        className
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sortDirection, onSort, ...props }, ref) => {
    const SortIcon = sortDirection === "asc" 
      ? ArrowUp 
      : sortDirection === "desc" 
        ? ArrowDown 
        : ArrowUpDown;

    return (
      <th
        ref={ref}
        className={cn(
          "h-12 px-4 text-left align-middle font-semibold text-muted-foreground",
          "[&:has([role=checkbox])]:pr-0",
          "text-xs uppercase tracking-wider",
          sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
          className,
        )}
        onClick={sortable ? onSort : undefined}
        aria-sort={sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : undefined}
        {...props}
      >
        {sortable ? (
          <div className="flex items-center gap-2 group">
            <span>{children}</span>
            <SortIcon 
              className={cn(
                "h-3.5 w-3.5 transition-opacity",
                sortDirection ? "opacity-100" : "opacity-0 group-hover:opacity-50"
              )} 
            />
          </div>
        ) : (
          children
        )}
      </th>
    );
  },
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement, 
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td 
    ref={ref} 
    className={cn(
      "p-4 align-middle [&:has([role=checkbox])]:pr-0",
      "text-foreground",
      className
    )} 
    {...props} 
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement, 
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption 
    ref={ref} 
    className={cn("mt-4 text-sm text-muted-foreground", className)} 
    {...props} 
  />
));
TableCaption.displayName = "TableCaption";

// ============================================
// Table Empty State Component
// ============================================
interface TableEmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  colSpan?: number;
}

const TableEmpty = ({ icon, title, description, action, colSpan = 1 }: TableEmptyProps) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="h-48">
      <div className="flex flex-col items-center justify-center gap-3 text-center py-8">
        {icon && (
          <div className="p-3 rounded-xl bg-muted/50">
            {icon}
          </div>
        )}
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground max-w-[300px]">{description}</p>
          )}
        </div>
        {action}
      </div>
    </TableCell>
  </TableRow>
);
TableEmpty.displayName = "TableEmpty";

// ============================================
// Table Loading Skeleton
// ============================================
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const TableSkeleton = ({ rows = 5, columns = 4 }: TableSkeletonProps) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <TableRow key={rowIndex} className="animate-pulse">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <TableCell key={colIndex}>
            <div className="h-4 bg-muted rounded-md" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);
TableSkeleton.displayName = "TableSkeleton";

export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableCaption,
  TableEmpty,
  TableSkeleton,
  tableVariants,
};
