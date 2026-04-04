import { useState, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Code,
  ChevronDown,
  Plus,
  FileText,
  Building2,
  Truck,
  Users,
  Package,
  FileSignature,
  PenTool,
  Loader2,
  Sparkles,
  CheckCircle,
  Zap,
  Info,
} from 'lucide-react';
import { ContractTemplate, MERGE_FIELDS, TEMPLATE_TYPES, MergeField } from '@/hooks/useContractTemplates';


interface ContractTemplateEditorProps {
  template: ContractTemplate;
  onSave: (updates: Partial<ContractTemplate>) => Promise<boolean>;
  onBack: () => void;
  saving: boolean;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Bedrijf': Building2,
  'Chauffeur': Truck,
  'Klant': Users,
  'Order': Package,
  'Contract': FileText,
  'Handtekening': PenTool,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Bedrijf': 'from-blue-500/20 to-blue-500/5 border-blue-500/30 hover:border-blue-500/50',
  'Chauffeur': 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50',
  'Klant': 'from-purple-500/20 to-purple-500/5 border-purple-500/30 hover:border-purple-500/50',
  'Order': 'from-amber-500/20 to-amber-500/5 border-amber-500/30 hover:border-amber-500/50',
  'Contract': 'from-rose-500/20 to-rose-500/5 border-rose-500/30 hover:border-rose-500/50',
  'Handtekening': 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/50',
};

export function ContractTemplateEditor({
  template,
  onSave,
  onBack,
  saving,
}: ContractTemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template.name,
    type: template.type,
    description: template.description || '',
    content_html: template.content_html || '',
    is_active: template.is_active,
  });
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [openCategories, setOpenCategories] = useState<string[]>(['Bedrijf', 'Chauffeur']);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [recentlyInserted, setRecentlyInserted] = useState<string | null>(null);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await onSave(formData);
  };

  const insertMergeField = useCallback((field: MergeField) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const mergeTag = `{{${field.key}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content_html;
    
    const newText = text.substring(0, start) + mergeTag + text.substring(end);
    setFormData(prev => ({ ...prev, content_html: newText }));
    
    // Visual feedback
    setRecentlyInserted(field.key);
    setTimeout(() => setRecentlyInserted(null), 1000);
    
    // Restore cursor position after the inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + mergeTag.length, start + mergeTag.length);
    }, 0);
  }, [formData.content_html]);

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Group merge fields by category
  const fieldsByCategory = MERGE_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, MergeField[]>);

  // Simple HTML to preview conversion
  const renderPreview = () => {
    let preview = formData.content_html;
    
    // Replace merge fields with placeholder values
    MERGE_FIELDS.forEach(field => {
      const regex = new RegExp(`\\{\\{${field.key}\\}\\}`, 'g');
      preview = preview.replace(regex, `<span class="bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium text-sm">[${field.label}]</span>`);
    });
    
    return preview;
  };

  const quickFields = [
    { key: 'company_name', label: 'Bedrijfsnaam', category: 'Bedrijf' },
    { key: 'driver_name', label: 'Chauffeur', category: 'Chauffeur' },
    { key: 'customer_name', label: 'Klant', category: 'Klant' },
    { key: 'signature_date', label: 'Datum', category: 'Handtekening' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div 
        className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 sm:p-6 animate-fade-in-up"
      >
        {/* Background effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 rounded-xl bg-background/50 backdrop-blur-sm hover:bg-background/80">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-lg blur-md" />
                <div className="relative p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  {template.id ? 'Sjabloon bewerken' : 'Nieuw sjabloon'}
                  {formData.is_active && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      <CheckCircle className="h-2.5 w-2.5 mr-1" />
                      Actief
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Versie {template.version}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="w-full sm:w-auto h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Opslaan
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '50ms' }}
          >
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Sjabloon details</CardTitle>
                    <CardDescription>Basisinformatie over het sjabloon</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Naam *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Bijv. Standaard chauffeurcontract"
                      className="h-11 bg-background/50 backdrop-blur-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm font-medium">Type *</Label>
                    <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
                      <SelectTrigger className="h-11 bg-background/50 backdrop-blur-sm">
                        <SelectValue placeholder="Selecteer type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Beschrijving</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Korte beschrijving van het sjabloon"
                    className="h-11 bg-background/50 backdrop-blur-sm"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Actief</Label>
                    <p className="text-xs text-muted-foreground">
                      Sjabloon beschikbaar voor gebruik
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleChange('is_active', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Editor Card */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/10">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Code className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Inhoud</CardTitle>
                      <CardDescription>Gebruik merge velden voor dynamische data</CardDescription>
                    </div>
                  </div>
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
                    <TabsList className="bg-muted/50">
                      <TabsTrigger value="edit" className="flex items-center gap-1.5 data-[state=active]:bg-background">
                        <Code className="h-3.5 w-3.5" />
                        Editor
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-1.5 data-[state=active]:bg-background">
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>

                  {activeTab === 'edit' ? (
                    <div
                      key="edit"
                      className="space-y-4 animate-fade-in"
                    >
                      {/* Quick Insert Bar */}
                      <div className="flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/20">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground font-medium">Sneltoetsen:</span>
                        {quickFields.map((field) => (
                          <div key={field.key}>
                            <Badge 
                              variant="outline" 
                              className={`text-xs cursor-pointer transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary ${
                                recentlyInserted === field.key ? 'bg-primary text-primary-foreground border-primary' : ''
                              }`}
                              onClick={() => insertMergeField(field as MergeField)}
                            >
                              {`{{${field.key}}}`}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      
                      <Textarea
                        ref={textareaRef}
                        value={formData.content_html}
                        onChange={(e) => handleChange('content_html', e.target.value)}
                        placeholder={`<h1>Contract titel</h1>

<p>Tussen {{company_name}}, gevestigd te {{company_city}}, hierna te noemen 'Opdrachtgever',</p>

<p>en</p>

<p>{{driver_name}}, hierna te noemen 'Chauffeur',</p>

<p>wordt het volgende overeengekomen:</p>

<h2>Artikel 1 - Werkzaamheden</h2>
<p>...</p>

<p>Aldus overeengekomen en ondertekend op {{signature_date}}:</p>`}
                        className="min-h-[400px] font-mono text-sm bg-background/50 backdrop-blur-sm resize-none"
                      />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Info className="h-3 w-3" />
                        <span>Tip: Gebruik HTML opmaak zoals {'<h1>'}, {'<h2>'}, {'<p>'}, {'<strong>'}, {'<em>'} voor structuur.</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      key="preview"
                      className="min-h-[400px] p-6 border rounded-lg bg-background animate-fade-in"
                    >
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderPreview()) }}
                      />
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Merge Fields Sidebar */}
        <div
          className="space-y-4 animate-fade-in-up"
          style={{ animationDelay: '150ms' }}
        >
          <Card className="sticky top-4 border-border/50 bg-gradient-to-br from-background to-muted/10 overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileSignature className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Merge velden
                    <Badge variant="secondary" className="text-[10px]">
                      {MERGE_FIELDS.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Klik om een veld in te voegen
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="p-4 space-y-2">
                  {Object.entries(fieldsByCategory).map(([category, fields], categoryIndex) => {
                    const Icon = CATEGORY_ICONS[category] || FileText;
                    const isOpen = openCategories.includes(category);
                    const colorClass = CATEGORY_COLORS[category] || 'from-gray-500/20 to-gray-500/5 border-gray-500/30';
                    
                    return (
                      <div
                        key={category}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${categoryIndex * 30}ms` }}
                      >
                        <Collapsible 
                          open={isOpen}
                          onOpenChange={() => toggleCategory(category)}
                        >
                          <CollapsibleTrigger asChild>
                            <div>
                              <Button
                                variant="ghost"
                                className={`w-full justify-between px-3 py-3 h-auto rounded-lg bg-gradient-to-r ${colorClass} border transition-all duration-200`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span className="font-medium text-sm">{category}</span>
                                  <Badge variant="secondary" className="text-[10px] bg-background/50">
                                    {fields.length}
                                  </Badge>
                                </div>
                                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                              </Button>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div 
                              className="pl-2 pr-1 py-2 space-y-1 animate-fade-in"
                            >
                              {fields.map((field, fieldIndex) => (
                                <button
                                  key={field.key}
                                  onClick={() => insertMergeField(field)}
                                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group hover:translate-x-1 ${
                                    recentlyInserted === field.key 
                                      ? 'bg-primary/20 border border-primary/30' 
                                      : 'hover:bg-muted/80 border border-transparent hover:border-border/50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-foreground/90">{field.label}</span>
                                    <Plus className={`h-3.5 w-3.5 transition-all duration-200 ${
                                      recentlyInserted === field.key 
                                        ? 'opacity-100 text-primary' 
                                        : 'opacity-0 group-hover:opacity-100 text-primary'
                                    }`} />
                                  </div>
                                  <code className="text-[11px] text-muted-foreground font-mono">
                                    {`{{${field.key}}}`}
                                  </code>
                                </button>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
