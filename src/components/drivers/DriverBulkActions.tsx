import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Power, PowerOff, Download, X, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriverBulkActionsProps {
  selectedCount: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onExportCsv: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

function Divider() {
  return <div className="w-px h-7 bg-border/30 shrink-0" />;
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  tooltip: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

function ActionButton({ icon: Icon, label, tooltip, onClick, variant = 'default' }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClick}
          className={cn(
            'gap-1.5 h-9 px-3 rounded-xl font-medium transition-all duration-150',
            'hover:bg-background/60 hover:shadow-sm active:scale-[0.97]',
            variant === 'destructive' && 'text-destructive hover:text-destructive hover:bg-destructive/10',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden md:inline text-xs">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function DriverBulkActions({
  selectedCount,
  onActivate,
  onDeactivate,
  onExportCsv,
  onDelete,
  onClearSelection,
}: DriverBulkActionsProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={cn(
            'flex items-center gap-1.5 pl-4 pr-2 py-2 rounded-2xl',
            'border border-border/20 bg-card/80 backdrop-blur-2xl',
            'shadow-[0_12px_48px_-8px_hsl(var(--foreground)/0.15),0_0_0_1px_hsl(var(--border)/0.1)]',
          )}>
            {/* Count badge */}
            <div className="flex items-center gap-2 pr-2">
              <div className="flex items-center justify-center h-7 min-w-[28px] px-2 rounded-lg bg-primary/15 text-primary">
                <span className="text-sm font-bold tabular-nums">{selectedCount}</span>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
                chauffeur{selectedCount !== 1 ? 's' : ''}
              </span>
            </div>

            <Divider />

            {/* Status actions */}
            <div className="flex items-center gap-0.5">
              <ActionButton
                icon={Power}
                label="Activeren"
                tooltip="Geselecteerde chauffeurs activeren"
                onClick={onActivate}
              />
              <ActionButton
                icon={PowerOff}
                label="Deactiveren"
                tooltip="Geselecteerde chauffeurs deactiveren"
                onClick={onDeactivate}
                variant="destructive"
              />
            </div>

            <Divider />

            {/* Export */}
            <ActionButton
              icon={Download}
              label="Export"
              tooltip="Exporteer selectie als CSV"
              onClick={onExportCsv}
            />

            <Divider />

            {/* Delete */}
            <ActionButton
              icon={Trash2}
              label="Verwijderen"
              tooltip="Geselecteerde chauffeurs verwijderen"
              onClick={onDelete}
              variant="destructive"
            />

            <Divider />

            {/* Close */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClearSelection}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Selectie wissen
              </TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
