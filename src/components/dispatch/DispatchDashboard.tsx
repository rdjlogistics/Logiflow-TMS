import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Zap,
  MessageSquare,
  CheckCircle2,
  Clock,
  TrendingUp,
  Settings,
  Activity,
  Users,
  Truck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { AIAutoDispatchPanel } from './AIAutoDispatchPanel';
import { DispatchConversationsPanel } from './DispatchConversationsPanel';
import { DispatchAutomationConfig } from './DispatchAutomationConfig';
import { DispatchAnalytics } from './DispatchAnalytics';
import { DispatchChannelStatus } from './DispatchChannelStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function DispatchDashboard() {
  const [activeTab, setActiveTab] = useState('dispatch');

  // Fetch dispatch stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dispatch-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [unassigned, conversations, assigned] = await Promise.all([
        supabase
          .from('trips')
          .select('id', { count: 'exact' })
          .is('driver_id', null)
          .is('deleted_at', null)
          .gte('trip_date', today),
        supabase
          .from('dispatch_conversations')
          .select('id, status', { count: 'exact' })
          .in('status', ['pending', 'awaiting_response']),
        supabase
          .from('trips')
          .select('id', { count: 'exact' })
          .not('driver_id', 'is', null)
          .is('deleted_at', null)
          .gte('trip_date', today),
      ]);

      // Get automation config
      const { data: config } = await supabase
        .from('dispatch_automation_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      return {
        unassignedTrips: unassigned.count || 0,
        activeConversations: conversations.count || 0,
        assignedToday: assigned.count || 0,
        automationEnabled: config?.is_active || false,
        autoAssignThreshold: config?.min_confidence_auto_assign || 90,
      };
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Dispatch Center
          </h1>
          <p className="text-muted-foreground">Automatische chauffeur-toewijzing met AI</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchStats()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Vernieuwen
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Te Plannen"
          value={stats?.unassignedTrips || 0}
          icon={Truck}
          trend={stats?.unassignedTrips === 0 ? 'positive' : 'attention'}
          description="Open ritten"
        />
        <StatsCard
          title="Actieve Gesprekken"
          value={stats?.activeConversations || 0}
          icon={MessageSquare}
          trend="neutral"
          description="WhatsApp onderhandelingen"
        />
        <StatsCard
          title="Toegewezen Vandaag"
          value={stats?.assignedToday || 0}
          icon={CheckCircle2}
          trend="positive"
          description="Succesvolle matches"
        />
        <StatsCard
          title="Automatisering"
          value={stats?.automationEnabled ? 'Actief' : 'Uit'}
          icon={Zap}
          trend={stats?.automationEnabled ? 'positive' : 'neutral'}
          description={`Threshold: ${stats?.autoAssignThreshold}%`}
          isText
        />
      </div>

      {/* Channel Status */}
      <DispatchChannelStatus />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="dispatch" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">AI Dispatch</span>
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Gesprekken</span>
            {typeof stats?.activeConversations === 'number' && stats.activeConversations > 0 && (
              <Badge className="ml-2 h-5 px-1.5 bg-green-500">{stats?.activeConversations}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Instellingen</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch" className="space-y-4">
          <AIAutoDispatchPanel onAssigned={() => refetchStats()} />
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <DispatchConversationsPanel />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <DispatchAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <DispatchAutomationConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend: 'positive' | 'negative' | 'neutral' | 'attention';
  description: string;
  isText?: boolean;
}

function StatsCard({ title, value, icon: Icon, trend, description, isText }: StatsCardProps) {
  const trendColors = {
    positive: 'text-green-500 bg-green-500/10',
    negative: 'text-red-500 bg-red-500/10',
    neutral: 'text-muted-foreground bg-muted',
    attention: 'text-yellow-500 bg-yellow-500/10',
  };

  return (
    <div
      className="relative"
    >
      <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{title}</span>
            <div className={cn("p-2 rounded-lg", trendColors[trend])}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <span className={cn(
              "font-bold",
              isText ? "text-xl" : "text-3xl"
            )}>
              {value}
            </span>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
