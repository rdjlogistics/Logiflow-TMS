import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useContractTemplates, ContractTemplate } from '@/hooks/useContractTemplates';
import { ContractTemplateList } from '@/components/contracts/ContractTemplateList';
import { ContractTemplateEditor } from '@/components/contracts/ContractTemplateEditor';
import { Loader2, ShieldAlert, FileText, Sparkles, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ContractTemplates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();
  const { 
    templates, 
    loading, 
    saving, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    duplicateTemplate,
  } = useContractTemplates();
  
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Stats
  const stats = {
    total: templates.length,
    active: templates.filter(t => t.is_active).length,
    inactive: templates.filter(t => !t.is_active).length,
    system: templates.filter(t => t.is_system_template).length,
  };

  // Check admin access
  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      toast({
        title: 'Geen toegang',
        description: 'Je hebt geen admin rechten om deze pagina te bekijken.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [role, roleLoading, navigate, toast]);

  const handleCreate = async () => {
    const newTemplate = await createTemplate({
      name: 'Nieuw sjabloon',
      type: 'other',
    });
    if (newTemplate) {
      setSelectedTemplate(newTemplate);
      setIsEditing(true);
    }
  };

  const handleEdit = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(true);
  };

  const handleSave = async (updates: Partial<ContractTemplate>) => {
    if (!selectedTemplate) return false;
    const success = await updateTemplate(selectedTemplate.id, updates);
    if (success) {
      setSelectedTemplate({ ...selectedTemplate, ...updates });
    }
    return success;
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setIsEditing(false);
  };

  const handleDuplicate = async (template: ContractTemplate) => {
    await duplicateTemplate(template);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
  };

  if (roleLoading || loading) {
    return (
      <DashboardLayout title="Contractsjablonen">
        <div className="flex items-center justify-center h-64">
          <div
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
            </div>
            <p className="text-muted-foreground">Sjablonen laden...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (role !== 'admin') {
    return (
      <DashboardLayout title="Contractsjablonen">
        <div
          className="flex flex-col items-center justify-center h-64 text-center"
        >
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl" />
            <ShieldAlert className="h-16 w-16 text-destructive relative" />
          </div>
          <h2 className="text-xl font-semibold">Geen toegang</h2>
          <p className="text-muted-foreground">Je hebt admin rechten nodig om deze pagina te bekijken.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Contractsjablonen" 
      description="Beheer herbruikbare contractsjablonen met merge velden"
    >
      <div className="space-y-6">
          {!isEditing ? (
            <div
              key="list"
              className="space-y-6"
            >
              {/* Premium Header */}
              <div
                className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6"
              >
                {/* Background glow effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                
                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/50 rounded-xl blur-lg opacity-50" />
                      <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                        <FileText className="h-7 w-7 text-primary-foreground" />
                      </div>
                    </div>
                    <div>
                      <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                        Contractsjablonen
                        <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-xs font-normal">
                          <Sparkles className="h-3 w-3" />
                          Enterprise
                        </Badge>
                      </h1>
                      <p className="text-muted-foreground text-sm mt-1">
                        Maak en beheer herbruikbare contractsjablonen met merge velden
                      </p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Totaal', value: stats.total, icon: FileText, color: 'text-primary' },
                      { label: 'Actief', value: stats.active, icon: CheckCircle, color: 'text-emerald-500' },
                      { label: 'Inactief', value: stats.inactive, icon: XCircle, color: 'text-amber-500' },
                      { label: 'Systeem', value: stats.system, icon: Clock, color: 'text-blue-500' },
                    ].map((stat, index) => (
                      <div
                        key={stat.label}
                        className="relative group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-background/40 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-2 p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50">
                          <stat.icon className={`h-4 w-4 ${stat.color}`} />
                          <div className="min-w-0">
                            <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                            <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <ContractTemplateList
                templates={templates}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onCreate={handleCreate}
              />
            </div>
          ) : (
            <div
              key="editor"
            >
              {selectedTemplate && (
                <ContractTemplateEditor
                  template={selectedTemplate}
                  onSave={handleSave}
                  onBack={handleBack}
                  saving={saving}
                />
              )}
            </div>
          )}
      </div>
    </DashboardLayout>
  );
};

export default ContractTemplates;
