import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  HelpCircle, 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  BookOpen,
  FileQuestion,
  Settings,
  Truck,
  CreditCard,
  Users,
  Save,
  Loader2,
  Languages,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content_markdown: string;
  language: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'getting_started', label: 'Aan de Slag', icon: BookOpen },
  { value: 'orders', label: 'Orders & Ritten', icon: Truck },
  { value: 'billing', label: 'Facturatie & Betalingen', icon: CreditCard },
  { value: 'drivers', label: 'Chauffeurs', icon: Users },
  { value: 'settings', label: 'Instellingen', icon: Settings },
  { value: 'faq', label: 'Veelgestelde Vragen', icon: FileQuestion },
];

const LANGUAGES = [
  { value: 'nl', label: '🇳🇱 Nederlands' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'de', label: '🇩🇪 Deutsch' },
  { value: 'fr', label: '🇫🇷 Français' },
];

const HelpCenter = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedLanguage, setSelectedLanguage] = useState('nl');
  const [isEditing, setIsEditing] = useState(false);
  const [editArticle, setEditArticle] = useState<Partial<HelpArticle>>({});
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  // Fetch articles
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['help-articles', selectedLanguage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('language', selectedLanguage)
        .order('category')
        .order('title');
      
      if (error) throw error;
      return data as HelpArticle[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (article: Partial<HelpArticle>) => {
      if (article.id) {
        const { error } = await supabase
          .from('help_articles')
          .update({
            category: article.category,
            title: article.title,
            content_markdown: article.content_markdown,
            language: article.language,
            is_published: article.is_published,
          })
          .eq('id', article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('help_articles')
          .insert({
            category: article.category!,
            title: article.title!,
            slug: article.title!.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            content_markdown: article.content_markdown || '',
            language: article.language || 'nl',
            is_published: article.is_published ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      toast({ title: 'Opgeslagen', description: 'Artikel is opgeslagen.' });
      setIsEditing(false);
      setEditArticle({});
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Kon artikel niet opslaan.', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('help_articles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-articles'] });
      toast({ title: 'Verwijderd', description: 'Artikel is verwijderd.' });
    },
  });

  // Filter and group articles
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content_markdown.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, selectedCategory]);

  const groupedArticles = useMemo(() => {
    const groups: Record<string, HelpArticle[]> = {};
    filteredArticles.forEach(article => {
      if (!groups[article.category]) {
        groups[article.category] = [];
      }
      groups[article.category].push(article);
    });
    return groups;
  }, [filteredArticles]);

  const handleCreate = () => {
    setEditArticle({
      title: '',
      content_markdown: '',
      category: 'getting_started',
      language: selectedLanguage,
      is_published: true,
    });
    setIsEditing(true);
    setSelectedArticle(null);
  };

  const handleEdit = (article: HelpArticle) => {
    setEditArticle(article);
    setIsEditing(true);
    setSelectedArticle(null);
  };

  const handleSave = () => {
    saveMutation.mutate(editArticle);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Kennisbank">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Kennisbank & Help Center" description="Beheer help artikelen en documentatie">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>Kennisbank</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-40">
                <Languages className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuw Artikel
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek in artikelen..."
              className="pl-10"
            />
          </div>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">Alle</TabsTrigger>
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="gap-1">
                  <cat.icon className="h-3 w-3" />
                  <span className="hidden lg:inline">{cat.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Articles by Category */}
        <div className="space-y-6">
          {Object.entries(groupedArticles).map(([category, categoryArticles]) => {
            const categoryConfig = CATEGORIES.find(c => c.value === category);
            const Icon = categoryConfig?.icon || BookOpen;

            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {categoryConfig?.label || category}
                    <Badge variant="secondary" className="ml-2">
                      {categoryArticles.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {categoryArticles.map((article) => (
                      <AccordionItem key={article.id} value={article.id}>
                        <AccordionTrigger className="hover:no-underline group">
                          <div className="flex items-center gap-3 text-left">
                            <span>{article.title}</span>
                            {!article.is_published && (
                              <Badge variant="outline" className="text-xs">Concept</Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div className="prose prose-sm max-w-none text-muted-foreground">
                              <div dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(
                                  article.content_markdown
                                    .replace(/\n/g, '<br/>')
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>'),
                                  { ALLOWED_TAGS: ['br', 'strong', 'em', 'p', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'code', 'pre'], ALLOWED_ATTR: ['href', 'target', 'rel'] }
                                )
                              }} />
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(article)}
                                className="gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                Bewerken
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(article.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                                Verwijderen
                              </Button>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {article.view_count || 0} weergaven
                              </span>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}

          {Object.keys(groupedArticles).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Geen artikelen gevonden</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Probeer een andere zoekterm' : 'Begin met het toevoegen van help artikelen'}
                </p>
                <Button onClick={handleCreate} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nieuw Artikel
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editArticle.id ? 'Artikel Bewerken' : 'Nieuw Artikel'}
              </DialogTitle>
              <DialogDescription>
                Schrijf een help artikel met Markdown formatting
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Titel</Label>
                  <Input
                    value={editArticle.title || ''}
                    onChange={(e) => setEditArticle({ ...editArticle, title: e.target.value })}
                    placeholder="Hoe maak ik een nieuwe order?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categorie</Label>
                  <Select
                    value={editArticle.category}
                    onValueChange={(v) => setEditArticle({ ...editArticle, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Taal</Label>
                  <Select
                    value={editArticle.language}
                    onValueChange={(v) => setEditArticle({ ...editArticle, language: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="published"
                    checked={editArticle.is_published ?? true}
                    onChange={(e) => setEditArticle({ ...editArticle, is_published: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="published">Gepubliceerd</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Inhoud (Markdown)</Label>
                <Textarea
                  value={editArticle.content_markdown || ''}
                  onChange={(e) => setEditArticle({ ...editArticle, content_markdown: e.target.value })}
                  placeholder="**Stap 1:** Ga naar Orders in het menu..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Gebruik **tekst** voor vet, *tekst* voor cursief, # voor koppen
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Opslaan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default HelpCenter;
