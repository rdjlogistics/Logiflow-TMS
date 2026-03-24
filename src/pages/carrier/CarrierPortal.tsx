import { useState, useCallback, Suspense, memo } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useAuth } from '@/hooks/useAuth';
import { useCarrierAuth } from '@/hooks/useCarrierAuth';
import { useCarrierTrips } from '@/hooks/useCarrierTrips';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Route,
  FileText,
  FolderOpen,
  User,
  Home,
  Loader2,
  LogOut,
  Truck,
  Inbox,
} from 'lucide-react';

const CarrierTripsTab = lazyWithRetry(() => import('./CarrierTripsTab'));
const CarrierInvoicesTab = lazyWithRetry(() => import('./CarrierInvoicesTab'));
const CarrierDocumentsTab = lazyWithRetry(() => import('./CarrierDocumentsTab'));
const CarrierProfileTab = lazyWithRetry(() => import('./CarrierProfileTab'));
const CarrierIncomingTab = lazyWithRetry(() => import('./CarrierIncomingTab'));

const TabSkeleton = memo(() => (
  <div className="flex-1 p-4 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full rounded-2xl" />
    <Skeleton className="h-24 w-full rounded-2xl" />
  </div>
));

type CarrierTab = 'ritten' | 'incoming' | 'facturen' | 'documenten' | 'profiel';

const CarrierPortal = () => {
  const { user, signOut } = useAuth();
  const carrier = useCarrierAuth();
  const { trips, loading: tripsLoading, activeTrip, fetchTrips } = useCarrierTrips(
    carrier.isCarrierUser ? carrier.carrierId : null,
    {
      portalScope: carrier.portalScope,
      contactId: carrier.contactId,
    }
  );
  const [activeTab, setActiveTab] = useState<CarrierTab>('ritten');

  const handleTabChange = useCallback((tab: CarrierTab) => {
    setActiveTab(tab);
  }, []);

  // Loading state
  if (carrier.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Portaal laden...</p>
        </div>
      </div>
    );
  }

  // Blocked (inactive carrier)
  if (carrier.isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <Truck className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Account gedeactiveerd</h1>
          <p className="text-muted-foreground">
            Uw charteraccount is momenteel gedeactiveerd. Neem contact op met de planning voor meer informatie.
          </p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Uitloggen
          </Button>
        </div>
      </div>
    );
  }

  // Not a carrier user
  if (!carrier.isCarrierUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">Geen toegang</h1>
          <p className="text-muted-foreground">
            Je account is niet gekoppeld aan een charter. Neem contact op met de planning.
          </p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Uitloggen
          </Button>
        </div>
      </div>
    );
  }

  const activeTripsCount = trips.filter(t => t.status === 'onderweg').length;

  const tabs: { key: CarrierTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'ritten', label: 'Ritten', icon: <Route className="h-5 w-5" />, badge: activeTripsCount || undefined },
    { key: 'incoming', label: 'Opdrachten', icon: <Inbox className="h-5 w-5" /> },
    { key: 'facturen', label: 'Facturen', icon: <FileText className="h-5 w-5" /> },
    ...(carrier.portalSettings?.show_documents ? [{ key: 'documenten' as CarrierTab, label: 'Documenten', icon: <FolderOpen className="h-5 w-5" /> }] : []),
    { key: 'profiel', label: 'Profiel', icon: <User className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold truncate">{carrier.carrierName}</h1>
            <p className="text-xs opacity-80">{carrier.contactName}</p>
          </div>
          {activeTripsCount > 0 && (
            <Badge variant="secondary" className="bg-white/20 text-white">
              {activeTripsCount} actief
            </Badge>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'ritten' && (
            <CarrierTripsTab
              trips={trips}
              loading={tripsLoading}
              carrierId={carrier.carrierId}
              portalRole={carrier.portalRole}
              onRefresh={fetchTrips}
            />
          )}
          {activeTab === 'incoming' && <CarrierIncomingTab />}
          {activeTab === 'facturen' && (
            <CarrierInvoicesTab carrierId={carrier.carrierId} />
          )}
          {activeTab === 'documenten' && carrier.portalSettings?.show_documents && (
            <CarrierDocumentsTab
              carrierId={carrier.carrierId}
              allowUpload={carrier.portalSettings?.allow_document_upload || false}
            />
          )}
          {activeTab === 'profiel' && (
            <CarrierProfileTab
              carrierName={carrier.carrierName}
              contactName={carrier.contactName}
              portalRole={carrier.portalRole}
              onLogout={signOut}
            />
          )}
        </Suspense>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border safe-area-bottom z-40">
        <div className="flex items-center justify-around py-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors relative',
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              <span className="text-[10px] font-medium hidden xs:inline">{tab.label}</span>
              {tab.badge && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CarrierPortal;
