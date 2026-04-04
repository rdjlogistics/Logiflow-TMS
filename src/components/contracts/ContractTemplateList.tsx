import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  FileText, 
  MoreVertical, 
  Pencil, 
  Copy, 
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Filter,
} from 'lucide-react';
import { ContractTemplate, TEMPLATE_TYPES } from '@/hooks/useContractTemplates';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';


interface ContractTemplateListProps {
  templates: ContractTemplate[];
  onEdit: (template: ContractTemplate) => void;
  onDuplicate: (template: ContractTemplate) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

export function ContractTemplateList({
  templates,
  onEdit,
  onDuplicate,
  onDelete,
  onCreate,
}: ContractTemplateListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && template.is_active) || 
      (filter === 'inactive' && !template.is_active);
    
    return matchesSearch && matchesFilter;
  });

  const getTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'driver_contract': 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
      'customer_agreement': 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
      'carrier_contract': 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
      'sla': 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
      'nda': 'from-red-500/20 to-red-500/5 border-red-500/30',
      'other': 'from-gray-500/20 to-gray-500/5 border-gray-500/30',
    };
    return colors[type] || colors.other;
  };

  const handleDeleteClick = (template: ContractTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      onDelete(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div 
        className="flex flex-col sm:flex-row gap-3 animate-fade-in-up"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek sjablonen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-colors"
          />
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'active', label: 'Actief' },
            { key: 'inactive', label: 'Inactief' },
          ].map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.key as typeof filter)}
              className={`h-11 px-4 transition-all duration-200 ${
                filter === f.key 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                  : 'bg-background/50 backdrop-blur-sm hover:bg-background/80'
              }`}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div>
          <Button 
            onClick={onCreate} 
            className="h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nieuw sjabloon
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <div>
        {filteredTemplates.length === 0 ? (
          <div
            className="animate-scale-fade-in"
          >
            <Card className="border-dashed border-2 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div
                  className="relative mb-6"
                >
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                    <FileText className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Geen sjablonen gevonden</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {searchQuery
                    ? 'Geen sjablonen komen overeen met uw zoekopdracht.'
                    : 'Maak uw eerste contractsjabloon aan om te beginnen met professionele documentatie.'}
                </p>
                {!searchQuery && (
                  <div>
                    <Button onClick={onCreate} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Eerste sjabloon maken
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div 
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filteredTemplates.map((template, index) => (
              <div
                key={template.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <Card 
                  className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 active:scale-[0.98] bg-gradient-to-br ${getTypeColor(template.type)}`}
                  onClick={() => onEdit(template)}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* System badge */}
                  {template.is_system_template && (
                    <div className="absolute top-3 right-12 z-10">
                      <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm">
                        Systeem
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className="relative shrink-0"
                        >
                          <div className="absolute inset-0 bg-primary/30 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 group-hover:border-primary/40 transition-colors">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                            {template.name}
                          </CardTitle>
                          <CardDescription className="truncate text-xs">
                            {getTypeLabel(template.type)}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-background/80"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(template); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(template); }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Dupliceren
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(template); }}
                            disabled={template.is_system_template}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 relative">
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge 
                          variant={template.is_active ? 'default' : 'secondary'} 
                          className={`text-xs ${
                            template.is_active 
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {template.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Actief
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactief
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">v{template.version}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Bijgewerkt {format(new Date(template.updated_at), 'd MMM yyyy', { locale: nl })}
                      </p>
                      <div 
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="text-xs text-primary font-medium">Bewerken →</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Sjabloon verwijderen?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Weet u zeker dat u "<span className="font-medium text-foreground">{templateToDelete?.name}</span>" wilt verwijderen? 
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="mt-0">Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
