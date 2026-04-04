import { useState, useEffect, Suspense, memo, useCallback } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDriverTrips } from '@/hooks/useDriverTrips';
import { MessengerPanel } from '@/components/messenger/MessengerPanel';
import { supabase } from '@/integrations/supabase/client';
import { DriverAIButton } from '@/components/portal-ai';

import { OfflineSyncIndicator } from '@/components/driver/OfflineSyncIndicator';
import { FloatingTruckMini } from '@/components/driver/FloatingTruckMini';
import { PushNotificationPrompt } from '@/components/driver-portal/PushNotificationPrompt';
import { BiometricSetupPrompt } from '@/components/driver/BiometricSetupPrompt';
import { GPSDebugOverlay } from '@/components/driver/GPSDebugOverlay';
import { useDriverGPS } from '@/hooks/useDriverGPS';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw,
  Calendar,
  Home,
  Route,
  MessageSquare,
  User,
  
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Dynamic greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
};

// Lazy load tabs for better initial load performance
const DriverHomeTab = lazyWithRetry(() => import('@/components/driver/tabs/DriverHomeTab').then(m => ({ default: m.DriverHomeTab })));
const DriverRoosterTab = lazyWithRetry(() => import('@/components/driver/tabs/DriverRoosterTab').then(m => ({ default: m.DriverRoosterTab })));
const DriverRittenTab = lazyWithRetry(() => import('@/components/driver/tabs/DriverRittenTab').then(m => ({ default: m.DriverRittenTab })));
const DriverChatTab = lazyWithRetry(() => import('@/components/driver/tabs/DriverChatTab').then(m => ({ default: m.DriverChatTab })));
const DriverProfielTab = lazyWithRetry(() => import('@/components/driver/tabs/DriverProfielTab').then(m => ({ default: m.DriverProfielTab })));


// Fast skeleton for tab loading
const TabSkeleton = memo(() => (
  <div className="flex-1 p-4 space-y-4">
    <Skeleton className="h-8 w-48 bg-white/5" />
    <Skeleton className="h-32 w-full rounded-2xl bg-white/5" />
    <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
    <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
  </div>
));

type DriverTab = 'home' | 'rooster' | 'chat' | 'ritten' | 'profiel';

const DriverPortal = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { trips, loading, activeTrip, fetchTrips, driverId } = useDriverTrips();
  const { isOnline, pendingCount, isSyncing, syncPendingCheckouts } = useOfflineSync();
  const { subscribeToTripUpdates, subscribeToMessages } = usePushNotifications();
  const [activeTab, setActiveTab] = useState<DriverTab>('home');
  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const {
    isTracking,
    currentLocation,
    permissionStatus,
    error: gpsError,
    requestPermission,
    startTracking,
    stopTracking,
  } = useDriverGPS({
    tripId: activeTrip?.id,
    enabled: !!activeTrip && activeTrip.status === 'onderweg',
  });

  // Subscribe to realtime trip notifications
  useEffect(() => {
    if (driverId) {
      const unsubscribe = subscribeToTripUpdates(driverId);
      return unsubscribe;
    }
  }, [driverId, subscribeToTripUpdates]);

  // Subscribe to realtime chat message notifications + unread count
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToMessages(user.id);

    // Listen for new chat messages to increment unread badge
    const chatChannel = supabase
      .channel(`unread-badge-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as { sender_role: string };
          // Only count messages from planners (not own chauffeur messages)
          if (msg.sender_role !== 'chauffeur' && activeTab !== 'chat') {
            setUnreadChatCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      unsubscribe();
      supabase.removeChannel(chatChannel);
    };
  }, [user?.id, subscribeToMessages, activeTab]);

  const activeTripsCount = trips.filter(t => t.status === 'onderweg').length;

  // Memoized tab change handler
  const handleTabChange = useCallback((tab: DriverTab) => {
    setActiveTab(tab);
    if (tab === 'chat') setUnreadChatCount(0);
  }, []);

  // Memoized handlers to prevent re-renders
  const handleNavigateToRooster = useCallback(() => setActiveTab('rooster'), []);
  const handleNavigateToRoutes = useCallback(() => setActiveTab('ritten'), []);
  const handleStartRoute = useCallback((tripId?: string) => {
    setActiveTab('ritten');
    if (tripId) {
      toast({ 
        title: "Rit gestart", 
        description: `Navigatie voor rit ${tripId.slice(0, 8)} wordt geopend...` 
      });
    }
  }, []);
  const handleStartChat = useCallback(() => {
    toast({ title: "Chat gestart", description: "Je bent nu verbonden met de planning." });
  }, []);
  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/driver/login', { replace: true });
  }, [signOut, navigate]);

  

  return (
    <div className="min-h-screen-safe bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a12] flex flex-col overscroll-contain md:items-center md:justify-center">
      {/* Desktop wrapper - macOS style window frame */}
      <div className="w-full md:max-w-[430px] md:mx-auto md:my-8 md:rounded-3xl md:overflow-hidden md:shadow-2xl md:shadow-black/50 md:border md:border-white/10 md:relative md:h-[calc(100vh-4rem)] flex flex-col min-h-screen-safe md:min-h-0">
      {/* Premium animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-primary/20 via-pink-500/10 to-transparent blur-3xl"
        />
        <div
          className="absolute -bottom-60 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-cyan-500/15 via-blue-500/10 to-transparent blur-3xl"
        />
      </div>

      {/* Header with premium styling */}
      <header className="flex-shrink-0 sticky top-0 z-50 bg-gradient-to-b from-[#0a0a0f]/95 to-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Premium 3D truck icon */}
              <div className="relative">
                <FloatingTruckMini size="sm" />
                {activeTripsCount > 0 && (
                  <div 
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-[#0a0a0f] flex items-center justify-center shadow-lg shadow-emerald-500/30"
                  >
                    <span className="text-[10px] font-bold text-white">{activeTripsCount}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 
                  className="font-bold text-lg text-white/95"
                >
                  {getGreeting()} 👋
                </h1>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(), 'EEEE d MMMM • HH:mm', { locale: nl })}
                </div>
              </div>
            </div>
            <div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={fetchTrips} 
                disabled={loading}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60"
              >
                <RefreshCw className={cn("h-5 w-5", loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>

        {/* Offline Status */}
        <div className="px-4 pb-4 space-y-2">
          <OfflineSyncIndicator
            isOnline={isOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onSync={syncPendingCheckouts}
          />
        </div>
      </header>

      {/* Content - optimized for instant switching */}
      <div className="flex-1 flex flex-col min-h-0 pb-24">
        <Suspense key={activeTab} fallback={<TabSkeleton />}>
          {activeTab === 'home' && (
            <DriverHomeTab
              onNavigateToRooster={handleNavigateToRooster}
              onNavigateToRoutes={handleNavigateToRoutes}
              onStartRoute={handleStartRoute}
              gpsPermissionStatus={permissionStatus}
              onRequestGPSPermission={requestPermission}
            />
          )}
          {activeTab === 'rooster' && (
            <DriverRoosterTab onNavigateToRoute={handleNavigateToRoutes} />
          )}
          {activeTab === 'ritten' && (
            <DriverRittenTab 
              onStartRoute={handleStartRoute} 
              gpsPermissionStatus={permissionStatus}
              onRequestGPSPermission={requestPermission}
            />
          )}
          {activeTab === 'chat' && (
            <DriverChatTab trips={trips} activeTrip={activeTrip} onStartChat={handleStartChat} />
          )}
          {activeTab === 'profiel' && (
            <DriverProfielTab onLogout={handleLogout} />
          )}
        </Suspense>
      </div>

      {/* Premium Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:absolute bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/98 to-[#0a0a0f]/90 backdrop-blur-2xl border-t border-white/5 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="grid grid-cols-5 gap-0.5 px-3 py-2">
          {[
            { id: 'home' as DriverTab, icon: Home, label: 'Home', badge: 0 },
            { id: 'rooster' as DriverTab, icon: Calendar, label: 'Rooster', badge: 0 },
            { id: 'chat' as DriverTab, icon: MessageSquare, label: 'Chat', badge: unreadChatCount },
            { id: 'ritten' as DriverTab, icon: Route, label: 'Ritten', badge: 0 },
            { id: 'profiel' as DriverTab, icon: User, label: 'Profiel', badge: 0 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 rounded-2xl transition-all duration-300 relative min-h-[48px]",
                activeTab === item.id 
                  ? "text-white" 
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {activeTab === item.id && (
                <span 
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-gradient-to-r from-primary to-pink-500"
                />
              )}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-0.5",
                  activeTab === item.id && "bg-white/10"
                )}}
              >
                <item.icon className="h-5 w-5" />
                {item.badge > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 border-2 border-[#0a0a0f] flex items-center justify-center"
                  >
                    <span className="text-[9px] font-bold text-white">{item.badge > 9 ? '9+' : item.badge}</span>
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] transition-all", 
                activeTab === item.id ? "font-bold" : "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Chat Sheet */}
      <Sheet open={showChat} onOpenChange={setShowChat}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          {activeTrip ? (
            <MessengerPanel
              tripId={activeTrip.id}
              tripName={activeTrip.order_number || `${activeTrip.pickup_city} → ${activeTrip.delivery_city}`}
              className="h-full border-0"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Start een route om te chatten
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* GPS Debug Overlay */}
      <GPSDebugOverlay
        isTracking={isTracking}
        currentLocation={currentLocation}
        permissionStatus={permissionStatus}
        tripId={activeTrip?.id}
        error={gpsError}
      />

      {/* AI Coach */}
      <DriverAIButton 
        tenantId={user?.id || ''} 
        tripId={activeTrip?.id}
        variant="floating"
      />

      {/* Push Notification Prompt */}
      <PushNotificationPrompt />

      {/* Biometric Setup Prompt */}
      <BiometricSetupPrompt />
      </div>
    </div>
  );
};

export default DriverPortal;
