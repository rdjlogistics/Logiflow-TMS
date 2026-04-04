import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Workflow,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChannelConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const channels: ChannelConfig[] = [
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    description: 'Resend',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-green-500 bg-green-500/10 border-green-500/30',
    description: 'MessageBird',
  },
  {
    id: 'sms',
    name: 'SMS',
    icon: Phone,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    description: 'MessageBird',
  },
  {
    id: 'n8n',
    name: 'n8n',
    icon: Workflow,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    description: 'Workflows',
  },
];

export function DispatchChannelStatus() {
  // Check which channels are configured
  const { data: channelStatus } = useQuery({
    queryKey: ['dispatch-channel-status'],
    queryFn: async () => {
      // Get automation config for enabled channels
      const { data: config } = await supabase
        .from('dispatch_automation_config')
        .select('notification_channels, is_active')
        .limit(1)
        .maybeSingle();

      // Get recent notification logs to check activity
      const { data: recentLogs } = await supabase
        .from('notification_logs')
        .select('channel_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      const enabledChannels = config?.notification_channels || [];
      const automationActive = config?.is_active || false;

      // Calculate channel stats from logs
      const channelStats: Record<string, { sent: number; failed: number; lastActivity: string | null }> = {};
      
      recentLogs?.forEach(log => {
        const channel = log.channel_type;
        if (!channelStats[channel]) {
          channelStats[channel] = { sent: 0, failed: 0, lastActivity: null };
        }
        if (log.status === 'sent' || log.status === 'delivered') {
          channelStats[channel].sent++;
        } else if (log.status === 'failed' || log.status === 'error') {
          channelStats[channel].failed++;
        }
        if (!channelStats[channel].lastActivity) {
          channelStats[channel].lastActivity = log.created_at;
        }
      });

      return {
        enabledChannels,
        automationActive,
        channelStats,
      };
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  const getChannelStatus = (channelId: string) => {
    const isEnabled = channelStatus?.enabledChannels?.includes(channelId) || false;
    const stats = channelStatus?.channelStats?.[channelId];
    const hasActivity = stats && (stats.sent > 0 || stats.failed > 0);
    const hasErrors = stats && stats.failed > 0;

    if (!isEnabled) return 'disabled';
    if (hasErrors && stats.failed > stats.sent) return 'error';
    if (hasActivity) return 'active';
    return 'ready';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Actief
          </Badge>
        );
      case 'ready':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Gereed
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
            <AlertCircle className="h-3 w-3" />
            Fout
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <XCircle className="h-3 w-3" />
            Uit
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow className="h-4 w-4 text-primary" />
          Notificatie Kanalen
          {channelStatus?.automationActive && (
            <Badge className="ml-auto bg-green-500/20 text-green-400 text-xs">
              Automatisering Actief
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {channels.map((channel, index) => {
            const status = getChannelStatus(channel.id);
            const Icon = channel.icon;
            const stats = channelStatus?.channelStats?.[channel.id];

            return (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  status === 'active' || status === 'ready'
                    ? channel.color
                    : "bg-muted/30 border-border/50 opacity-60"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    status === 'active' || status === 'ready' 
                      ? "bg-background/50" 
                      : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      status === 'active' || status === 'ready'
                        ? channel.color.split(' ')[0]
                        : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{channel.name}</p>
                    <p className="text-[10px] text-muted-foreground">{channel.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  {getStatusBadge(status)}
                  {stats && (status === 'active' || status === 'ready') && (
                    <span className="text-[10px] text-muted-foreground">
                      {stats.sent} verzonden
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
