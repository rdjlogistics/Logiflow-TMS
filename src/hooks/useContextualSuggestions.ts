import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

export interface ContextualSuggestion {
  id: string;
  type: 'action' | 'optimization' | 'warning' | 'info';
  title: string;
  description: string;
  priority: number;
  actionable: boolean;
  actionLabel?: string;
  actionData?: Record<string, any>;
}

export type ContextType = 
  | 'order_form' 
  | 'dispatch' 
  | 'invoice' 
  | 'customer_view' 
  | 'driver_assignment'
  | 'route_planning'
  | 'dashboard';

interface ContextData {
  type: ContextType;
  data: Record<string, any>;
  recentActions?: string[];
}

export const useContextualSuggestions = () => {
  const { company } = useCompany();
  const [suggestions, setSuggestions] = useState<ContextualSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Get suggestions based on current context
  const getSuggestions = useCallback(async (context: ContextData) => {
    if (!company?.id) return [];

    setLoading(true);
    try {
      // Build context-specific prompt
      let prompt = '';
      
      switch (context.type) {
        case 'order_form':
          prompt = `De gebruiker is bezig met een order formulier.
Huidige data:
${JSON.stringify(context.data, null, 2)}

Genereer suggesties voor:
- Slimme defaults op basis van klant/route historie
- Waarschuwingen voor ongebruikelijke waarden
- Optimalisatie tips (bijv. combineren met andere orders)
- Ontbrekende informatie die ingevuld moet worden`;
          break;

        case 'dispatch':
          prompt = `De gebruiker plant chauffeur toewijzingen.
Huidige planning:
${JSON.stringify(context.data, null, 2)}

Genereer suggesties voor:
- Beste chauffeur match op basis van ervaring/locatie
- Waarschuwingen voor overbelasting/compliance
- Route optimalisaties
- Conflicten met andere ritten`;
          break;

        case 'invoice':
          prompt = `De gebruiker werkt aan facturatie.
Factuur data:
${JSON.stringify(context.data, null, 2)}

Genereer suggesties voor:
- Ontbrekende kostenposten
- Afwijkingen van tarieven
- Credit check waarschuwingen
- Bundel/batch mogelijkheden`;
          break;

        case 'customer_view':
          prompt = `De gebruiker bekijkt een klantprofiel.
Klant data:
${JSON.stringify(context.data, null, 2)}

Genereer suggesties voor:
- Upsell/cross-sell kansen
- Relatie verbetering tips
- Risico waarschuwingen
- Volume/marge trends`;
          break;

        case 'driver_assignment':
          prompt = `De gebruiker wijst een chauffeur toe aan een rit.
Context:
${JSON.stringify(context.data, null, 2)}

Genereer suggesties voor:
- Beste chauffeur keuze met uitleg
- Alternatieven met trade-offs
- Beschikbaarheid conflicten
- Prestatie-gebaseerde aanbevelingen`;
          break;

        case 'route_planning':
          prompt = `De gebruiker plant routes.
Route data:
${JSON.stringify(context.data, null, 2)}

Genereer suggesties voor:
- Route optimalisaties
- Consolidatie mogelijkheden
- Timing verbeteringen
- Kosten reductie tips`;
          break;

        case 'dashboard':
          prompt = `De gebruiker bekijkt het dashboard.
Recente acties: ${context.recentActions?.join(', ') || 'geen'}
Data snapshot:
${JSON.stringify(context.data, null, 2)}

Genereer suggesties voor:
- Meest urgente taken
- Quick wins voor vandaag
- Items die aandacht nodig hebben
- Volgende logische stappen`;
          break;

        default:
          prompt = `Genereer contextuele suggesties op basis van:
${JSON.stringify(context, null, 2)}`;
      }

      const { data, error } = await supabase.functions.invoke('smart-ai', {
        body: {
          action: 'get-suggestions',
          mode: 'contextual',
          message: prompt,
          data: {
            contextType: context.type,
            companyId: company.id,
          },
        },
      });

      if (error) throw error;

      if (data.suggestions && Array.isArray(data.suggestions)) {
        const formattedSuggestions: ContextualSuggestion[] = data.suggestions
          .map((s: any, idx: number) => ({
            id: `sug-${Date.now()}-${idx}`,
            type: s.type,
            title: s.title,
            description: s.description,
            priority: s.priority,
            actionable: s.actionable ?? false,
            actionLabel: s.actionLabel,
            actionData: s.actionData,
          }))
          .sort((a: ContextualSuggestion, b: ContextualSuggestion) => b.priority - a.priority);

        setSuggestions(formattedSuggestions);
        return formattedSuggestions;
      }

      return [];
    } catch (error) {
      console.error('Suggestion error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }, []);

  return {
    suggestions,
    loading,
    getSuggestions,
    clearSuggestions,
    dismissSuggestion,
  };
};
