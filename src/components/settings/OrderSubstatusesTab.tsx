import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Tag, GripVertical, Pencil, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderSubstatus {
  id: string;
  name: string;
  color: string | null;
  available_in_driver_app: boolean;
  visible_on_tracking: boolean;
  sort_order: number;
  is_active: boolean;
}

const COLOR_PRESETS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export const OrderSubstatusesTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [substatuses, setSubstatuses] = useState<OrderSubstatus[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);

  const fetchSubstatuses = async () => {
    const { data, error } = await supabase
      .from('order_substatuses')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching substatuses:', error);
      toast({ title: 'Fout bij ophalen substatussen', variant: 'destructive' });
    } else {
      setSubstatuses((data || []) as OrderSubstatus[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSubstatuses(); }, []);

  const addSubstatus = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('order_substatuses').insert({
      name: newName.trim(), color: newColor, sort_order: substatuses.length,
      available_in_driver_app: false, visible_on_tracking: false,
    } as any);

    if (error) {
      toast({ title: 'Fout', description: 'Kon substatus niet toevoegen', variant: 'destructive' });
    } else {
      setNewName('');
      await fetchSubstatuses();
      toast({ title: 'Substatus toegevoegd' });
    }
    setSaving(false);
  };

  const updateSubstatus = async (id: string, updates: Partial<OrderSubstatus>) => {
    const { error } = await supabase.from('order_substatuses').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Fout', description: 'Kon substatus niet bijwerken', variant: 'destructive' });
    } else {
      setSubstatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
  };

  const deleteSubstatus = async (id: string) => {
    const { error } = await supabase.from('order_substatuses').delete().eq('id', id);
    if (error) {
      toast({ title: 'Fout', description: 'Kon substatus niet verwijderen', variant: 'destructive' });
    } else {
      setSubstatuses(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Substatus verwijderd' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 md:space-y-6"
    >
      <Card variant="glass">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <motion.div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center" whileHover={{ rotate: 10, scale: 1.1 }}>
              <Tag className="h-5 w-5 text-primary" />
            </motion.div>
            <div>
              <CardTitle className="text-base md:text-lg">Order Substatussen</CardTitle>
              <CardDescription>
                Definieer substatussen die chauffeurs kunnen selecteren bij het afmelden.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-sm font-medium">Nieuwe substatus</Label>
              <Input
                placeholder="bijv. Afgeleverd bij buren"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubstatus()}
                className="text-base md:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Kleur</Label>
              <div className="flex gap-1.5">
                {COLOR_PRESETS.slice(0, 4).map(c => (
                  <button
                    key={c}
                    className={cn(
                      "w-9 h-9 md:w-8 md:h-10 rounded-lg border-2 transition-all",
                      newColor === c ? 'border-primary scale-110 shadow-md' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
            </div>
            <Button onClick={addSubstatus} disabled={!newName.trim() || saving} className="h-10 sm:h-10">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {/* List */}
          <div className="space-y-2">
            <AnimatePresence>
              {substatuses.map((sub) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 md:gap-3 p-3 rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 hidden sm:block" />
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: sub.color || '#9ca3af' }} />

                  {editingId === sub.id ? (
                    <Input
                      value={sub.name}
                      onChange={(e) => setSubstatuses(prev => prev.map(s => s.id === sub.id ? { ...s, name: e.target.value } : s))}
                      className="h-8 text-sm flex-1"
                      autoFocus
                    />
                  ) : (
                    <span className={cn("text-sm font-medium flex-1 truncate", !sub.is_active && "line-through text-muted-foreground")}>
                      {sub.name}
                    </span>
                  )}

                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                      <Switch checked={sub.available_in_driver_app} onCheckedChange={(v) => updateSubstatus(sub.id, { available_in_driver_app: v })} className="scale-75" />
                      <span className="text-[10px] md:text-xs text-muted-foreground">App</span>
                    </div>
                    <div className="flex items-center gap-1 hidden sm:flex">
                      <Switch checked={sub.visible_on_tracking} onCheckedChange={(v) => updateSubstatus(sub.id, { visible_on_tracking: v })} className="scale-75" />
                      <span className="text-[10px] md:text-xs text-muted-foreground">T&T</span>
                    </div>

                    {editingId === sub.id ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { updateSubstatus(sub.id, { name: sub.name }); setEditingId(null); }}>
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(sub.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteSubstatus(sub.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {substatuses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nog geen substatussen aangemaakt</p>
                <p className="text-xs mt-1">Voeg substatussen toe die chauffeurs kunnen selecteren bij het afmelden van een stop.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
