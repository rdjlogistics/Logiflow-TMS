import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PortalAIPanel } from './PortalAIPanel';
import { Bot, Sparkles, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriverAIButtonProps {
  tenantId: string;
  tripId?: string;
  stopId?: string;
  className?: string;
  variant?: 'floating' | 'inline';
}

export const DriverAIButton = ({ 
  tenantId, 
  tripId,
  stopId,
  className,
  variant = 'floating',
}: DriverAIButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkFeatureFlags = async () => {
      if (!tenantId) {
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('portal_feature_flags')
          .select('flag_key, enabled')
          .eq('tenant_id', tenantId)
          .in('flag_key', ['FF_DRIVER_AI_ASSISTANT', 'FF_DRIVER_VOICE_ACTIONS']);

        if (!error && data) {
          const aiFlag = data.find(f => f.flag_key === 'FF_DRIVER_AI_ASSISTANT');
          const voiceFlag = data.find(f => f.flag_key === 'FF_DRIVER_VOICE_ACTIONS');
          
          setIsEnabled(aiFlag?.enabled ?? false);
          setVoiceEnabled(voiceFlag?.enabled ?? false);
        }
      } catch (err) {
        console.error('Error checking feature flags:', err);
      } finally {
        setChecking(false);
      }
    };

    checkFeatureFlags();
  }, [tenantId]);

  if (checking || !isEnabled) return null;

  const contextType = tripId ? 'ORDER' : 'GENERAL';
  const contextId = tripId;

  if (variant === 'floating') {
    return (
      <>
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed bottom-24 right-4 z-40 h-14 w-14 rounded-2xl shadow-2xl',
            'bg-gradient-to-br from-primary via-primary to-primary-glow',
            'hover:opacity-90 transition-all duration-300 hover:scale-105',
            'shadow-primary/40',
            className
          )}
        >
          <div className="relative">
            <Bot className="h-6 w-6 text-primary-foreground" />
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </Button>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent 
            side="bottom" 
            className="h-[85vh] rounded-t-3xl p-0 flex flex-col"
          >
            <div className="w-12 h-1.5 rounded-full bg-muted mx-auto mt-3 mb-1" />
            <PortalAIPanel
              portalType="DRIVER"
              tenantId={tenantId}
              contextType={contextType as any}
              contextId={contextId}
              onClose={() => setIsOpen(false)}
              title="AI Coach"
            />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Button
      onClick={() => setIsOpen(true)}
      variant="outline"
      size="sm"
      className={cn(
        'gap-2 rounded-xl border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary',
        className
      )}
    >
      <Sparkles className="h-4 w-4" />
      <span>AI Coach</span>
    </Button>
  );
};
