/**
 * Batch T20: Barrel exports for UI component library
 * Import anything from '@/components/ui':
 *   import { Skeleton, EmptyState, StatusBadge, ProgressBar } from '@/components/ui';
 *
 * Note: shadcn/ui primitives are exported individually from their own files.
 * This barrel re-exports the LogiFlow custom components + common primitives.
 */

// ── LogiFlow Custom Components ────────────────────────────────────────────────
export { GlassSkeleton, GlassTableSkeleton, GlassCardSkeleton, GlassFormSkeleton, GlassListSkeleton, Skeleton } from './skeleton';
export { EmptyState } from './EmptyState';
export { ScrollToTop } from './ScrollToTop';
export { StatusBadge } from './StatusBadge';
export { ConfirmDialog } from './ConfirmDialog';
export { DeleteConfirmDialog } from './DeleteConfirmDialog';
export { UserAvatar } from './UserAvatar';
export { ProgressBar } from './ProgressBar';

// ── Skeleton Loaders (existing) ───────────────────────────────────────────────
export {
  DashboardCardSkeleton,
  StatsGridSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  ActionQueueSkeleton,
  ChartSkeleton,
  ShipmentCardSkeleton,
  KPICardSkeleton,
  PageLoadingSkeleton,
  MapSkeleton,
  TimelineSkeleton,
  DriverCardSkeleton,
  MobileCardSkeleton,
  FormSkeleton,
} from './skeleton-loaders';

// ── shadcn/ui Primitives ──────────────────────────────────────────────────────
export { Button, buttonVariants } from './button';
export { Badge, badgeVariants } from './badge';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Input } from './input';
export { Label } from './label';
export { Textarea } from './textarea';
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton } from './select';
export { Checkbox } from './checkbox';
export { Switch } from './switch';
export { Slider } from './slider';
export { Progress } from './progress';
export { Separator } from './separator';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './dialog';
export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './alert-dialog';
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup } from './dropdown-menu';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './table';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
export { Popover, PopoverTrigger, PopoverContent } from './popover';
export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './sheet';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
export { ScrollArea, ScrollBar } from './scroll-area';
export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './pagination';
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from './breadcrumb';
export { Alert, AlertDescription, AlertTitle } from './alert';
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from './form';
export { Toaster as Sonner } from './sonner';
export { Toaster } from './toaster';
export { toast, useToast } from './use-toast';
export { Toggle, toggleVariants } from './toggle';
export { ToggleGroup, ToggleGroupItem } from './toggle-group';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
export { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';
