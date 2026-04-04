import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bell,
  User,
  Car,
  Calendar,
  Shield,
  RefreshCw,
  ChevronRight,
  Loader2,
  BellRing,
  FileWarning,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { format, differenceInDays, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const containerVariants = { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { staggerChildren: 0.03 } } };
const itemVariants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } };

const ExpiryAlerts = () => {
  const { company } = useCompany();
  const [activeTab, setActiveTab] = useState('all');

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['all-compliance-docs', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('compliance_documents')
        .select('*, profiles:entity_id(full_name), vehicles:entity_id(license_plate)')
        .eq('company_id', company.id)
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: 'valid', daysLeft: null, urgency: 0 };
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { status: 'expired', daysLeft: days, urgency: 3 };
    if (days <= 7) return { status: 'critical', daysLeft: days, urgency: 2 };
    if (days <= 30) return { status: 'warning', daysLeft: days, urgency: 1 };
    return { status: 'valid', daysLeft: days, urgency: 0 };
  };

  // Filter documents needing attention
  const alertDocs = documents?.filter(doc => {
    const { urgency } = getExpiryStatus(doc.expiry_date);
    return urgency > 0;
  }).sort((a, b) => {
    const urgencyA = getExpiryStatus(a.expiry_date).urgency;
    const urgencyB = getExpiryStatus(b.expiry_date).urgency;
    return urgencyB - urgencyA;
  }) || [];

  const expiredDocs = alertDocs.filter(d => getExpiryStatus(d.expiry_date).status === 'expired');
  const criticalDocs = alertDocs.filter(d => getExpiryStatus(d.expiry_date).status === 'critical');
  const warningDocs = alertDocs.filter(d => getExpiryStatus(d.expiry_date).status === 'warning');

  const filteredDocs = activeTab === 'all' 
    ? alertDocs 
    : activeTab === 'expired' 
    ? expiredDocs 
    : activeTab === 'critical' 
    ? criticalDocs 
    : warningDocs;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'expired':
        return { 
          color: 'bg-red-500/10 text-red-400 border-red-500/20', 
          icon: AlertTriangle, 
          label: 'Verlopen',
          glow: 'shadow-red-500/20',
          gradient: 'from-red-500/20 to-red-600/5'
        };
      case 'critical':
        return { 
          color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', 
          icon: AlertCircle, 
          label: 'Kritiek',
          glow: 'shadow-orange-500/20',
          gradient: 'from-orange-500/20 to-orange-600/5'
        };
      case 'warning':
        return { 
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', 
          icon: Clock, 
          label: 'Waarschuwing',
          glow: 'shadow-amber-500/20',
          gradient: 'from-amber-500/20 to-amber-600/5'
        };
      default:
        return { 
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 
          icon: CheckCircle2, 
          label: 'Geldig',
          glow: 'shadow-emerald-500/20',
          gradient: 'from-emerald-500/20 to-emerald-600/5'
        };
    }
  };

  return (
    <DashboardLayout title="Vervaldata & Alerts" description="Proactieve compliance monitoring">
      <div className="space-y-6">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-background to-orange-500/5 border border-amber-500/20 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <BellRing className="h-7 w-7 text-white" />
                </div>
                {alertDocs.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                    {alertDocs.length}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Vervaldata & Alerts
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {alertDocs.length} document{alertDocs.length !== 1 ? 'en' : ''} vereist aandacht
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-10 border-border/50">
                <RefreshCw className="h-4 w-4 mr-2" />
                Vernieuwen
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card variant="glass" className={cn("border-red-500/20 hover:border-red-500/40 transition-colors cursor-pointer", activeTab === 'expired' && "ring-1 ring-red-500/50")} onClick={() => setActiveTab('expired')}>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-3xl font-bold text-red-400">{expiredDocs.length}</p>
              <p className="text-xs text-muted-foreground">Verlopen</p>
            </CardContent>
          </Card>
          
          <Card variant="glass" className={cn("border-orange-500/20 hover:border-orange-500/40 transition-colors cursor-pointer", activeTab === 'critical' && "ring-1 ring-orange-500/50")} onClick={() => setActiveTab('critical')}>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="h-6 w-6 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-orange-400">{criticalDocs.length}</p>
              <p className="text-xs text-muted-foreground">&lt; 7 dagen</p>
            </CardContent>
          </Card>
          
          <Card variant="glass" className={cn("border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer", activeTab === 'warning' && "ring-1 ring-amber-500/50")} onClick={() => setActiveTab('warning')}>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-amber-400">{warningDocs.length}</p>
              <p className="text-xs text-muted-foreground">&lt; 30 dagen</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-11 bg-muted/30">
              <TabsTrigger value="all" className="data-[state=active]:bg-background">
                Alle ({alertDocs.length})
              </TabsTrigger>
              <TabsTrigger value="expired" className="data-[state=active]:bg-background data-[state=active]:text-red-400">
                Verlopen
              </TabsTrigger>
              <TabsTrigger value="critical" className="data-[state=active]:bg-background data-[state=active]:text-orange-400">
                Kritiek
              </TabsTrigger>
              <TabsTrigger value="warning" className="data-[state=active]:bg-background data-[state=active]:text-amber-400">
                Waarschuwing
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <Card variant="glass">
            <CardContent className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
              <p className="text-sm text-muted-foreground mt-3">Documenten controleren...</p>
            </CardContent>
          </Card>
        ) : filteredDocs.length === 0 ? (
          <div>
            <Card variant="glass" className="border-emerald-500/20">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
                <p className="font-semibold text-lg mb-1 text-emerald-400">Alles in orde!</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === 'all' ? 'Geen documenten vereisen aandacht' : 'Geen documenten in deze categorie'}
                </p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/compliance/driver-docs">
                      <User className="h-4 w-4 mr-2" />
                      Chauffeur Docs
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/compliance/vehicle-docs">
                      <Car className="h-4 w-4 mr-2" />
                      Voertuig Docs
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => {
              const { status, daysLeft } = getExpiryStatus(doc.expiry_date);
              const config = getStatusConfig(status);
              const isDriver = doc.entity_type === 'driver';
              const entityName = isDriver 
                ? (doc.profiles as any)?.full_name 
                : (doc.vehicles as any)?.license_plate;
              
              return (
                <div
                  key={doc.id}
                  className={cn(
                    "group relative rounded-xl border bg-gradient-to-br p-4 transition-all hover:shadow-lg",
                    config.gradient,
                    "border-border/50 hover:border-primary/30 cursor-pointer active:scale-[0.99]"
                  )}}}
                >
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      config.color
                    )}>
                      <config.icon className="h-6 w-6" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">{doc.doc_name}</p>
                        <Badge className={cn("text-[10px]", config.color)}>
                          {status === 'expired' 
                            ? `${Math.abs(daysLeft!)} dagen verlopen`
                            : `${daysLeft} dagen`
                          }
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {isDriver ? <User className="h-3.5 w-3.5" /> : <Car className="h-3.5 w-3.5" />}
                          <span>{entityName || 'Onbekend'}</span>
                        </div>
                        {doc.expiry_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(new Date(doc.expiry_date), 'd MMMM yyyy', { locale: nl })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      asChild
                    >
                      <Link to={isDriver ? '/compliance/driver-docs' : '/compliance/vehicle-docs'}>
                        Bekijken
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExpiryAlerts;
