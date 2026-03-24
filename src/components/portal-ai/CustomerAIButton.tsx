import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalAIPanel } from './PortalAIPanel';
import { 
  Bot, 
  Sparkles, 
  MapPin, 
  Package, 
  FileText, 
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerAIButtonProps {
  tenantId: string;
  orderId?: string;
  invoiceId?: string;
  className?: string;
}

export const CustomerAIButton = ({ 
  tenantId, 
  orderId, 
  invoiceId,
  className 
}: CustomerAIButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tracking');
  const [isEnabled, setIsEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkFeatureFlag = async () => {
      if (!tenantId) {
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('portal_feature_flags')
          .select('enabled')
          .eq('tenant_id', tenantId)
          .eq('flag_key', 'FF_CUSTOMER_AI_ASSISTANT')
          .maybeSingle();

        if (!error && data) {
          setIsEnabled(data.enabled);
        }
      } catch (err) {
        console.error('Error checking feature flag:', err);
      } finally {
        setChecking(false);
      }
    };

    checkFeatureFlag();
  }, [tenantId]);

  // Auto-select tab based on context
  useEffect(() => {
    if (orderId) setActiveTab('tracking');
    if (invoiceId) setActiveTab('invoice');
  }, [orderId, invoiceId]);

  if (checking || !isEnabled) return null;

  const getContextForTab = () => {
    switch (activeTab) {
      case 'tracking':
        return { type: orderId ? 'ORDER' : 'GENERAL', id: orderId };
      case 'invoice':
        return { type: invoiceId ? 'INVOICE' : 'GENERAL', id: invoiceId };
      case 'order':
        return { type: 'GENERAL' as const, id: undefined };
      case 'dispute':
        return { type: orderId ? 'ORDER' : 'GENERAL', id: orderId };
      default:
        return { type: 'GENERAL' as const, id: undefined };
    }
  };

  const context = getContextForTab();

  return (
    <>
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
        <span className="hidden sm:inline">AI Help</span>
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md p-0 flex flex-col"
        >
          {/* Tabs Header */}
          <div className="border-b border-border/40 bg-muted/30 px-4 py-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 h-10 bg-background/50">
                <TabsTrigger value="tracking" className="gap-1.5 text-xs rounded-lg">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Volgen</span>
                </TabsTrigger>
                <TabsTrigger value="order" className="gap-1.5 text-xs rounded-lg">
                  <Package className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Order</span>
                </TabsTrigger>
                <TabsTrigger value="invoice" className="gap-1.5 text-xs rounded-lg">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Factuur</span>
                </TabsTrigger>
                <TabsTrigger value="dispute" className="gap-1.5 text-xs rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Claim</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* AI Panel */}
          <div className="flex-1 overflow-hidden">
            <PortalAIPanel
              portalType="CUSTOMER"
              tenantId={tenantId}
              contextType={context.type as any}
              contextId={context.id}
              title={getTabTitle(activeTab)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

const getTabTitle = (tab: string) => {
  switch (tab) {
    case 'tracking':
      return 'Zending Volgen';
    case 'order':
      return 'Nieuwe Order';
    case 'invoice':
      return 'Factuur Uitleg';
    case 'dispute':
      return 'Claim/Dispute';
    default:
      return 'AI Assistent';
  }
};
