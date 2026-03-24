import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  FileText, 
  Send, 
  Save, 
  ChevronRight,
  Check,
  ChevronsUpDown,
  Loader2,
  Users,
  Truck,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useContractTemplates, ContractTemplate, MERGE_FIELDS, TEMPLATE_TYPES } from '@/hooks/useContractTemplates';
import { CreateContractParams } from '@/hooks/useContractManagement';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type CounterpartyType = Database['public']['Enums']['counterparty_type'];

interface Recipient {
  id: string;
  name: string;
  email: string;
  type: CounterpartyType;
}

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: CreateContractParams) => Promise<unknown>;
  isSubmitting: boolean;
}

type Step = 'template' | 'recipient' | 'content' | 'review';

export function CreateContractDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: CreateContractDialogProps) {
  const { templates, loading: templatesLoading } = useContractTemplates();
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [recipientType, setRecipientType] = useState<CounterpartyType>('driver');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content_html: '',
    send_immediately: true,
    expires_at: '',
  });

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('template');
      setSelectedTemplate(null);
      setSelectedRecipient(null);
      setFormData({
        title: '',
        content_html: '',
        send_immediately: true,
        expires_at: '',
      });
    }
  }, [open]);

  // Fetch recipients when type changes
  useEffect(() => {
    const fetchRecipients = async () => {
      setLoadingRecipients(true);
      setRecipients([]);
      setSelectedRecipient(null);
      
      try {
        if (recipientType === 'driver') {
          // Fetch drivers (users with chauffeur role)
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'chauffeur');
          
          if (roleData && roleData.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name, phone')
              .in('user_id', roleData.map(r => r.user_id));
            
            const driverRecipients: Recipient[] = (profiles || []).map(p => ({
              id: p.user_id,
              name: p.full_name || 'Onbekend',
              email: p.phone || '', // We don't have email in profiles, use phone as placeholder
              type: 'driver' as CounterpartyType,
            }));
            setRecipients(driverRecipients);
          }
        } else if (recipientType === 'customer') {
          const { data: customers } = await supabase
            .from('customers')
            .select('id, company_name, contact_name, email')
            .order('company_name');
          
          const customerRecipients: Recipient[] = (customers || []).map(c => ({
            id: c.id,
            name: c.contact_name || c.company_name,
            email: c.email || '',
            type: 'customer' as CounterpartyType,
          }));
          setRecipients(customerRecipients);
        } else if (recipientType === 'carrier') {
          const { data: carriers } = await supabase
            .from('carriers')
            .select('id, company_name, contact_name, email')
            .order('company_name');
          
          const carrierRecipients: Recipient[] = (carriers || []).map(c => ({
            id: c.id,
            name: c.contact_name || c.company_name,
            email: c.email || '',
            type: 'carrier' as CounterpartyType,
          }));
          setRecipients(carrierRecipients);
        }
      } catch (error) {
        console.error('Error fetching recipients:', error);
      } finally {
        setLoadingRecipients(false);
      }
    };

    if (step === 'recipient') {
      fetchRecipients();
    }
  }, [recipientType, step]);

  // Apply template
  useEffect(() => {
    if (selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        title: selectedTemplate.name,
        content_html: selectedTemplate.content_html || '',
      }));
    }
  }, [selectedTemplate]);

  const handleNext = () => {
    const steps: Step[] = ['template', 'recipient', 'content', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['template', 'recipient', 'content', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'template':
        return !!selectedTemplate;
      case 'recipient':
        return !!selectedRecipient;
      case 'content':
        return !!formData.title && !!formData.content_html;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !selectedRecipient) return;

    await onSubmit({
      title: formData.title,
      type: selectedTemplate.type,
      content_html: formData.content_html,
      counterparty_id: selectedRecipient.id,
      counterparty_type: selectedRecipient.type,
      counterparty_name: selectedRecipient.name,
      counterparty_email: selectedRecipient.email,
      template_id: selectedTemplate.id,
      expires_at: formData.expires_at || undefined,
      send_immediately: formData.send_immediately,
    });

    onOpenChange(false);
  };

  const getRecipientTypeIcon = (type: CounterpartyType) => {
    switch (type) {
      case 'driver': return Truck;
      case 'customer': return Users;
      case 'carrier': return Building2;
      default: return Users;
    }
  };

  const getTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nieuw contract
          </DialogTitle>
          <DialogDescription>
            {step === 'template' && 'Kies een sjabloon om te beginnen'}
            {step === 'recipient' && 'Selecteer de ontvanger'}
            {step === 'content' && 'Pas de inhoud aan'}
            {step === 'review' && 'Controleer en verzend'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          {(['template', 'recipient', 'content', 'review'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step === s 
                  ? "bg-primary text-primary-foreground" 
                  : ['template', 'recipient', 'content', 'review'].indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
              )}>
                {['template', 'recipient', 'content', 'review'].indexOf(step) > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && (
                <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 px-1">
          <div className="py-4 space-y-4">
            {/* Step 1: Template Selection */}
            {step === 'template' && (
              <div className="space-y-3">
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.filter(t => t.is_active).length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium">Geen sjablonen beschikbaar</p>
                    <p className="text-sm text-muted-foreground">
                      Maak eerst een sjabloon aan in Contractsjablonen
                    </p>
                  </div>
                ) : (
                  templates.filter(t => t.is_active).map(template => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-all hover:border-primary",
                        selectedTemplate?.id === template.id 
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                          : "border-border"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getTypeLabel(template.type)}
                          </p>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                        </div>
                        {selectedTemplate?.id === template.id && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Step 2: Recipient Selection */}
            {step === 'recipient' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type ontvanger</Label>
                  <Select 
                    value={recipientType} 
                    onValueChange={(v) => setRecipientType(v as CounterpartyType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Chauffeur
                        </div>
                      </SelectItem>
                      <SelectItem value="customer">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Klant
                        </div>
                      </SelectItem>
                      <SelectItem value="carrier">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Charter
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Selecteer ontvanger</Label>
                  <Popover open={recipientPopoverOpen} onOpenChange={setRecipientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                        disabled={loadingRecipients}
                      >
                        {loadingRecipients ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Laden...
                          </span>
                        ) : selectedRecipient ? (
                          <span className="flex items-center gap-2">
                            {(() => {
                              const Icon = getRecipientTypeIcon(selectedRecipient.type);
                              return <Icon className="h-4 w-4" />;
                            })()}
                            {selectedRecipient.name}
                          </span>
                        ) : (
                          'Selecteer ontvanger...'
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Zoeken..." />
                        <CommandList>
                          <CommandEmpty>Geen resultaten gevonden.</CommandEmpty>
                          <CommandGroup>
                            {recipients.map(recipient => (
                              <CommandItem
                                key={recipient.id}
                                value={recipient.name}
                                onSelect={() => {
                                  setSelectedRecipient(recipient);
                                  setRecipientPopoverOpen(false);
                                }}
                              >
                                {(() => {
                                  const Icon = getRecipientTypeIcon(recipient.type);
                                  return <Icon className="mr-2 h-4 w-4" />;
                                })()}
                                <div className="flex-1">
                                  <p>{recipient.name}</p>
                                  {recipient.email && (
                                    <p className="text-xs text-muted-foreground">
                                      {recipient.email}
                                    </p>
                                  )}
                                </div>
                                {selectedRecipient?.id === recipient.id && (
                                  <Check className="h-4 w-4" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedRecipient && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const Icon = getRecipientTypeIcon(selectedRecipient.type);
                        return (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                        );
                      })()}
                      <div>
                        <p className="font-medium">{selectedRecipient.name}</p>
                        {selectedRecipient.email && (
                          <p className="text-sm text-muted-foreground">
                            {selectedRecipient.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Content Editing */}
            {step === 'content' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Contract titel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Inhoud *</Label>
                  <Textarea
                    id="content"
                    value={formData.content_html}
                    onChange={(e) => setFormData(prev => ({ ...prev, content_html: e.target.value }))}
                    placeholder="Contract inhoud..."
                    className="min-h-[250px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Gebruik merge velden zoals {'{{customer_name}}'} voor dynamische data
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_at">Vervaldatum (optioneel)</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 'review' && selectedTemplate && selectedRecipient && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-3">
                  <h4 className="font-medium">Contract overzicht</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Titel</p>
                      <p className="font-medium">{formData.title}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sjabloon</p>
                      <p className="font-medium">{selectedTemplate.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium">{getTypeLabel(selectedTemplate.type)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ontvanger</p>
                      <p className="font-medium">{selectedRecipient.name}</p>
                    </div>
                    {formData.expires_at && (
                      <div>
                        <p className="text-muted-foreground">Vervaldatum</p>
                        <p className="font-medium">{formData.expires_at}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Direct verzenden</Label>
                    <p className="text-xs text-muted-foreground">
                      Contract direct verzenden naar ontvanger
                    </p>
                  </div>
                  <Switch
                    checked={formData.send_immediately}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, send_immediately: checked }))
                    }
                  />
                </div>

                {formData.send_immediately && (
                  <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Send className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">
                        Contract wordt direct verzonden
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        {selectedRecipient.name} ontvangt het contract ter ondertekening
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={step === 'template' ? () => onOpenChange(false) : handleBack}
          >
            {step === 'template' ? 'Annuleren' : 'Terug'}
          </Button>
          
          {step === 'review' ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-premium"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : formData.send_immediately ? (
                <Send className="h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSubmitting 
                ? 'Bezig...' 
                : formData.send_immediately 
                  ? 'Verzenden' 
                  : 'Opslaan als concept'
              }
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Volgende
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
