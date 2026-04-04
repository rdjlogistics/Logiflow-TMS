import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { MoreHorizontal, Edit, Archive, Trash2, Loader2 } from 'lucide-react';

interface MigrationProject {
  id: string;
  name: string;
  status: string;
}

interface ProjectOptionsMenuProps {
  projectId: string;
  projectName: string;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onRename?: (id: string, newName: string) => Promise<void>;
}

export function ProjectOptionsMenu({
  projectId,
  projectName,
  onEdit,
  onArchive,
  onDelete,
  onRename,
}: ProjectOptionsMenuProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newName, setNewName] = useState(projectName);
  const [loading, setLoading] = useState(false);

  const handleRename = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      if (onRename) {
        await onRename(projectId, newName.trim());
      }
      toast({
        title: "Project hernoemd",
        description: `Project is hernoemd naar "${newName.trim()}".`,
      });
      setRenameDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setLoading(true);
    try {
      onArchive?.();
      toast({
        title: "Project gearchiveerd",
        description: `${projectName} is gearchiveerd.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      onDelete?.();
      toast({
        title: "Project verwijderd",
        description: `${projectName} is permanent verwijderd.`,
      });
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); setRenameDialogOpen(true); >
            <Edit className="h-4 w-4 mr-2" />
            Hernoemen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(); >
            <Archive className="h-4 w-4 mr-2" />
            Archiveren
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive focus:text-destructive"
            onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Verwijderen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Project Hernoemen</DialogTitle>
            <DialogDescription>
              Geef een nieuwe naam op voor dit migratieproject.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Projectnaam</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nieuwe naam..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleRename} disabled={loading || !newName.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Project Verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{projectName}" wilt verwijderen? 
              Alle staging records, rapporten en audit logs worden permanent verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">
              ⚠️ Deze actie kan niet ongedaan worden gemaakt.
            </p>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Permanent Verwijderen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
