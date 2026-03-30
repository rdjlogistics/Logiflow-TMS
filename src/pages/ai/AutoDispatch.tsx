import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Brain,
  Zap,
  Target,
  MessageSquare,
  BarChart3,
  Settings,
  Bot,
  Info,
  Power,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// AI Dispatch Components
import { DispatchConversationsPanel } from "@/components/dispatch/DispatchConversationsPanel";
import { DispatchAutomationConfig } from "@/components/dispatch/DispatchAutomationConfig";
import { DispatchAnalytics } from "@/components/dispatch/DispatchAnalytics";
import { AIAutoDispatchPanel } from "@/components/dispatch/AIAutoDispatchPanel";

export default function AutoDispatch() {
  const [activeTab, setActiveTab] = useState("dispatch");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch stats including config id
  const { data: stats } = useQuery({
    queryKey: ['ai-dispatch-stats'],
    queryFn: async () => {
      const [tripsResult, conversationsResult, configResult] = await Promise.all([
        supabase.from('trips').select('id, driver_id').is('driver_id', null).limit(100),
        supabase.from('dispatch_conversations').select('id, status').in('status', ['pending', 'awaiting_response']),
        supabase.from('dispatch_automation_config').select('id, is_active').limit(1).maybeSingle(),
      ]);

      return {
        unassignedTrips: tripsResult.data?.length || 0,
        activeConversations: conversationsResult.data?.length || 0,
        automationActive: configResult.data?.is_active || false,
        configId: configResult.data?.id || null,
      };
    },
  });

  // Mutation to toggle AI active state
  const toggleAIMutation = useMutation({
    mutationFn: async (activate: boolean) => {
      if (stats?.configId) {
        const { error } = await supabase
          .from('dispatch_automation_config')
          .update({ is_active: activate })
          .eq('id', stats.configId);
        if (error) throw error;
      } else {
        // Create config if it doesn't exist
        const { error } = await supabase
          .from('dispatch_automation_config')
          .insert({ is_active: activate } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, activate) => {
      queryClient.invalidateQueries({ queryKey: ['ai-dispatch-stats'] });
      toast({
        title: activate ? '🤖 AI Dispatch Geactiveerd' : 'AI Dispatch Gedeactiveerd',
        description: activate 
          ? 'De AI analyseert nieuwe ritten automatisch.' 
          : 'AI Dispatch staat nu op handmatig.',
      });
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Kon AI status niet wijzigen', variant: 'destructive' });
    },
  });

  const isActive = stats?.automationActive || false;

  return (
    <DashboardLayout title="AI Auto-Dispatch" description="Intelligente eigen chauffeur-toewijzing met AI">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Onbemande Ritten"
            value={stats?.unassignedTrips || 0}
            icon={Target}
            trend={stats?.unassignedTrips && stats.unassignedTrips > 5 ? 'attention' : 'positive'}
          />
          <StatsCard
            title="Actieve Gesprekken"
            value={stats?.activeConversations || 0}
            icon={MessageSquare}
            trend="neutral"
          />

          {/* AI Status Card - Interactive */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'text-green-500 bg-green-500/10' : 'text-yellow-500 bg-yellow-500/10'}`}>
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-2xl font-bold">{isActive ? 'Actief' : 'Inactief'}</p>
                    {!isActive && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            <p className="text-xs">AI Dispatch is inactief. Activeer het om ritten automatisch te laten analyseren.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">AI Status</p>
                </div>
                {!isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs border-green-500/50 text-green-500 hover:bg-green-500/10"
                    onClick={() => toggleAIMutation.mutate(true)}
                    disabled={toggleAIMutation.isPending}
                  >
                    <Power className="h-3 w-3 mr-1" />
                    Activeer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Automatisering Card - Interactive Toggle */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground bg-muted'}`}>
                  <Zap className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold">{isActive ? 'Automatisch' : 'Handmatig'}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {isActive 
                      ? 'AI wijst automatisch chauffeurs toe' 
                      : 'Klik op een rit om handmatig toe te wijzen'}
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => toggleAIMutation.mutate(checked)}
                  disabled={toggleAIMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50 border border-border/50">
            <TabsTrigger value="dispatch" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Dispatch
            </TabsTrigger>
            <TabsTrigger value="conversations" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Gesprekken
              {typeof stats?.activeConversations === 'number' && stats.activeConversations > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {stats.activeConversations}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Instellingen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dispatch">
            <AIAutoDispatchPanel />
          </TabsContent>

          <TabsContent value="conversations">
            <DispatchConversationsPanel />
          </TabsContent>

          <TabsContent value="analytics">
            <DispatchAnalytics />
          </TabsContent>

          <TabsContent value="settings">
            <DispatchAutomationConfig />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend: 'positive' | 'negative' | 'neutral' | 'attention';
}

function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  const trendColors = {
    positive: 'text-green-500 bg-green-500/10',
    negative: 'text-red-500 bg-red-500/10',
    neutral: 'text-muted-foreground bg-muted',
    attention: 'text-yellow-500 bg-yellow-500/10',
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${trendColors[trend]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
