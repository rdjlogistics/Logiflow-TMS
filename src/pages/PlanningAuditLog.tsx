import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  History, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  actor_id: string | null;
  actor_role: string | null;
  before_state: Json | null;
  after_state: Json | null;
  metadata: Json | null;
  is_rectification: boolean | null;
  rectifies_event_id: string | null;
  created_at: string;
}

interface ProfileMap {
  [userId: string]: { full_name: string | null };
}

const eventTypeConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  'shift_created': { label: 'Shift aangemaakt', icon: Plus, color: 'text-green-600' },
  'shift_published': { label: 'Shift gepubliceerd', icon: CheckCircle2, color: 'text-blue-600' },
  'shift_paused': { label: 'Shift gepauzeerd', icon: Clock, color: 'text-yellow-600' },
  'shift_cancelled': { label: 'Shift geannuleerd', icon: XCircle, color: 'text-red-600' },
  'shift_filled': { label: 'Shift gevuld', icon: CheckCircle2, color: 'text-green-600' },
  'shift_updated': { label: 'Shift bijgewerkt', icon: Edit2, color: 'text-primary' },
  'application_submitted': { label: 'Aanmelding ontvangen', icon: Plus, color: 'text-blue-600' },
  'application_approved': { label: 'Aanmelding goedgekeurd', icon: CheckCircle2, color: 'text-green-600' },
  'application_rejected': { label: 'Aanmelding afgewezen', icon: XCircle, color: 'text-red-600' },
  'application_cancelled': { label: 'Aanmelding geannuleerd', icon: Trash2, color: 'text-muted-foreground' },
  'driver_assigned': { label: 'Chauffeur toegewezen', icon: User, color: 'text-green-600' },
  'driver_unassigned': { label: 'Chauffeur ontkoppeld', icon: User, color: 'text-red-600' },
};

const PlanningAuditLog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Fetch audit logs
  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', format(dateRange.from, 'yyyy-MM-dd'), format(dateRange.to, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_audit_log')
        .select('*')
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  // Fetch actor profiles
  const actorIds = [...new Set(auditLogs.map(l => l.actor_id).filter(Boolean))] as string[];
  const { data: profiles = {} } = useQuery({
    queryKey: ['audit-log-profiles', actorIds],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', actorIds);

      if (error) throw error;
      return (data || []).reduce((acc, p) => {
        acc[p.user_id] = { full_name: p.full_name };
        return acc;
      }, {} as ProfileMap);
    },
  });

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    // Entity filter
    if (entityFilter !== 'all' && log.entity_type !== entityFilter) return false;
    // Event filter
    if (eventFilter !== 'all' && log.event_type !== eventFilter) return false;
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const actorName = profiles[log.actor_id || '']?.full_name?.toLowerCase() || '';
      if (!log.entity_id.toLowerCase().includes(term) && !actorName.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const toggleExpanded = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getActorName = (actorId: string | null) => {
    if (!actorId) return 'Systeem';
    return profiles[actorId]?.full_name || 'Onbekende gebruiker';
  };

  const formatJsonPreview = (json: Json | null): string => {
    if (!json) return '-';
    if (typeof json === 'string') return json;
    try {
      const str = JSON.stringify(json, null, 2);
      return str.length > 100 ? str.substring(0, 100) + '...' : str;
    } catch {
      return '-';
    }
  };

  // Get unique event types for filter
  const uniqueEventTypes = [...new Set(auditLogs.map(l => l.event_type))];

  return (
    <DashboardLayout 
      title="Audit Log" 
      description="Bekijk alle acties in het planning systeem"
    >
      <div className="space-y-4 md:space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-3">
              {/* Search - Full width on mobile */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              
              {/* Filters row - Scrollable on mobile */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {/* Entity Filter */}
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[130px] h-9 shrink-0">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Entiteit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="shift">Shifts</SelectItem>
                    <SelectItem value="application">Aanmeldingen</SelectItem>
                  </SelectContent>
                </Select>

                {/* Event Filter */}
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-[150px] h-9 shrink-0">
                    <SelectValue placeholder="Event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle events</SelectItem>
                    {uniqueEventTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {eventTypeConfig[type]?.label || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Range */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 px-3 shrink-0">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      <span className="text-sm">
                        {format(dateRange.from, 'd MMM', { locale: nl })} - {format(dateRange.to, 'd MMM', { locale: nl })}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to });
                        }
                      }}
                      locale={nl}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>

                {/* Refresh */}
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => refetch()}>
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats - 2x2 grid on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold">{auditLogs.length}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Totaal events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-green-600">
                {auditLogs.filter(l => l.event_type.includes('approved') || l.event_type.includes('created')).length}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Goedgekeurd</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-red-600">
                {auditLogs.filter(l => l.event_type.includes('rejected') || l.event_type.includes('cancelled')).length}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Afgewezen</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-blue-600">
                {[...new Set(auditLogs.map(l => l.actor_id).filter(Boolean))].length}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Actoren</div>
            </CardContent>
          </Card>
        </div>

        {/* Log Entries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <History className="h-4 w-4 md:h-5 md:w-5" />
              Audit Trail ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] md:h-[600px]">
              <div className="divide-y">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Geen audit logs gevonden
                  </div>
                ) : (
                  filteredLogs.map(log => {
                    const config = eventTypeConfig[log.event_type] || {
                      label: log.event_type,
                      icon: FileText,
                      color: 'text-muted-foreground'
                    };
                    const Icon = config.icon;
                    const isExpanded = expandedEntries.has(log.id);

                    return (
                      <div key={log.id} className="p-3 md:p-4 hover:bg-muted/50 transition-colors">
                        <div 
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => toggleExpanded(log.id)}
                        >
                          {/* Icon */}
                          <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center bg-muted/50 shrink-0", config.color)}>
                            <Icon className="h-4 w-4 md:h-5 md:w-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("font-medium text-sm", config.color)}>
                                {config.label}
                              </span>
                              <Badge variant="outline" className="text-[10px] md:text-xs">
                                {log.entity_type}
                              </Badge>
                              {log.is_rectification && (
                                <Badge variant="secondary" className="text-[10px] md:text-xs">
                                  Correctie
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-[100px] md:max-w-none">{getActorName(log.actor_id)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(log.created_at), 'd MMM HH:mm', { locale: nl })}
                              </span>
                            </div>
                          </div>

                          {/* Expand Toggle */}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                          )}
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-3 ml-11 md:ml-14 space-y-3">
                            <div className="grid grid-cols-1 gap-3">
                              {log.before_state && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Before</p>
                                  <pre className="text-[10px] md:text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-32">
                                    {JSON.stringify(log.before_state, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.after_state && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">After</p>
                                  <pre className="text-[10px] md:text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-32">
                                    {JSON.stringify(log.after_state, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] md:text-xs text-muted-foreground">
                              ID: <code className="bg-muted px-1 rounded text-[10px]">{log.entity_id.slice(0, 8)}...</code>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PlanningAuditLog;
