import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Brain,
  Users,
  MessageSquare,
  Zap,
  BarChart3,
  Target,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export function DispatchAnalytics() {
  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['dispatch-analytics'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [conversations, scoringLogs, trips] = await Promise.all([
        supabase
          .from('dispatch_conversations')
          .select('id, status, ai_confidence, created_at, confirmed_at, responded_at')
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('dispatch_scoring_log')
          .select('id, overall_score, ai_confidence, driver_id, created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('trips')
          .select('id, driver_id, created_at')
          .gte('created_at', thirtyDaysAgo.toISOString()),
      ]);

      const convData = conversations.data || [];
      const scoringData = scoringLogs.data || [];
      const tripsData = trips.data || [];

      // Calculate metrics
      const totalConversations = convData.length;
      const confirmedCount = convData.filter(c => c.status === 'confirmed').length;
      const declinedCount = convData.filter(c => c.status === 'declined').length;
      const expiredCount = convData.filter(c => c.status === 'expired').length;

      const successRate = totalConversations > 0 
        ? Math.round((confirmedCount / totalConversations) * 100) 
        : 0;

      // Average response time (for confirmed)
      const confirmedWithResponse = convData.filter(c => c.confirmed_at && c.created_at);
      const avgResponseTime = confirmedWithResponse.length > 0
        ? Math.round(confirmedWithResponse.reduce((acc, c) => {
            const diff = new Date(c.confirmed_at as string).getTime() - new Date(c.created_at as string).getTime();
            return acc + (diff / 1000 / 60); // minutes
          }, 0) / confirmedWithResponse.length)
        : 0;

      // Average AI confidence
      const avgConfidence = convData.length > 0
        ? Math.round(convData.reduce((acc, c) => acc + (c.ai_confidence || 0), 0) / convData.length)
        : 0;

      // Status breakdown for pie chart
      const statusBreakdown = [
        { name: 'Bevestigd', value: confirmedCount, color: '#22c55e' },
        { name: 'Geweigerd', value: declinedCount, color: '#ef4444' },
        { name: 'Verlopen', value: expiredCount, color: '#94a3b8' },
        { name: 'In Behandeling', value: convData.filter(c => ['pending', 'awaiting_response'].includes(c.status)).length, color: '#3b82f6' },
      ].filter(s => s.value > 0);

      // Daily trend (last 7 days)
      const dailyTrend: { date: string; dispatches: number; confirmed: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayConvs = convData.filter(c => c.created_at?.startsWith(dateStr));
        dailyTrend.push({
          date: date.toLocaleDateString('nl-NL', { weekday: 'short' }),
          dispatches: dayConvs.length,
          confirmed: dayConvs.filter(c => c.status === 'confirmed').length,
        });
      }

      // Top drivers by score
      const driverScores = new Map<string, { total: number; count: number }>();
      scoringData.forEach(s => {
        if (s.driver_id) {
          const current = driverScores.get(s.driver_id) || { total: 0, count: 0 };
          driverScores.set(s.driver_id, {
            total: current.total + s.overall_score,
            count: current.count + 1,
          });
        }
      });

      return {
        totalConversations,
        confirmedCount,
        declinedCount,
        expiredCount,
        successRate,
        avgResponseTime,
        avgConfidence,
        statusBreakdown,
        dailyTrend,
        totalScored: scoringData.length,
        assignedTrips: tripsData.filter(t => t.driver_id).length,
        unassignedTrips: tripsData.filter(t => !t.driver_id).length,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-card/50 animate-pulse">
            <CardContent className="h-48" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Succes Rate"
          value={`${analytics?.successRate || 0}%`}
          icon={Target}
          trend="positive"
          description="Bevestigde dispatches"
        />
        <MetricCard
          title="Gem. Response Tijd"
          value={`${analytics?.avgResponseTime || 0} min`}
          icon={Clock}
          trend="neutral"
          description="Van vraag tot bevestiging"
        />
        <MetricCard
          title="AI Confidence"
          value={`${analytics?.avgConfidence || 0}%`}
          icon={Brain}
          trend={analytics?.avgConfidence && analytics.avgConfidence >= 80 ? 'positive' : 'attention'}
          description="Gemiddelde zekerheid"
        />
        <MetricCard
          title="Totaal Geanalyseerd"
          value={analytics?.totalScored || 0}
          icon={BarChart3}
          trend="positive"
          description="Chauffeur-scores"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Trend */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Dispatch Trend (7 dagen)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.dailyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="dispatches" name="Dispatches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="confirmed" name="Bevestigd" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Status Verdeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              {analytics?.statusBreakdown && analytics.statusBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">Geen data beschikbaar</p>
              )}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {analytics?.statusBreakdown?.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Gedetailleerde Statistieken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatItem
              label="Totaal Gesprekken"
              value={analytics?.totalConversations || 0}
              icon={MessageSquare}
            />
            <StatItem
              label="Bevestigd"
              value={analytics?.confirmedCount || 0}
              icon={CheckCircle2}
              color="text-green-500"
            />
            <StatItem
              label="Geweigerd"
              value={analytics?.declinedCount || 0}
              icon={XCircle}
              color="text-red-500"
            />
            <StatItem
              label="Verlopen"
              value={analytics?.expiredCount || 0}
              icon={Clock}
              color="text-gray-500"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Rit Toewijzing (30 dagen)</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Toegewezen</span>
                  <span className="text-sm font-medium">{analytics?.assignedTrips || 0}</span>
                </div>
                <Progress value={
                  (analytics?.assignedTrips || 0) / 
                  ((analytics?.assignedTrips || 0) + (analytics?.unassignedTrips || 1)) * 100
                } className="h-2" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Open</span>
                  <span className="text-sm font-medium">{analytics?.unassignedTrips || 0}</span>
                </div>
                <Progress value={
                  (analytics?.unassignedTrips || 0) / 
                  ((analytics?.assignedTrips || 1) + (analytics?.unassignedTrips || 0)) * 100
                } className="h-2 [&>div]:bg-yellow-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend: 'positive' | 'negative' | 'neutral' | 'attention';
  description: string;
}

function MetricCard({ title, value, icon: Icon, trend, description }: MetricCardProps) {
  const trendColors = {
    positive: 'text-green-500 bg-green-500/10',
    negative: 'text-red-500 bg-red-500/10',
    neutral: 'text-muted-foreground bg-muted',
    attention: 'text-yellow-500 bg-yellow-500/10',
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 hover:scale-[1.02] transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className={cn("p-2 rounded-lg", trendColors[trend])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <span className="text-2xl font-bold">{value}</span>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

interface StatItemProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
}

function StatItem({ label, value, icon: Icon, color = 'text-primary' }: StatItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-lg bg-muted", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
