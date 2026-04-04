import React, { ReactNode, useCallback, Suspense } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubmissionNotifications } from "@/hooks/useSubmissionNotifications";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useOnboardingRequired } from "@/hooks/useOnboardingRequired";
import { useCopilotContext } from "@/components/copilot";
import { SessionWarningDialog } from "@/components/security/SessionWarningDialog";
import { SessionRefreshIndicator } from "@/components/driver/SessionRefreshIndicator";
import { Loader2, Menu, Bot, Sparkles, Command, Bell, RefreshCw } from "lucide-react";
import { GlobalSearch } from "@/components/common/GlobalSearch";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SkipLink } from "@/components/accessibility/VisuallyHidden";
import { NotificationBell, NotificationProvider } from "@/components/notifications/NotificationCenter";

import { IsolatedErrorBoundary } from "@/components/error/ErrorBoundary";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  const { user, loading, signOut, refreshSession } = useAuth();
  const { canAccessChatGPT, loading: roleLoading } = useUserRole();
  const { openCommandBar } = useCopilotContext();
  const navigate = useNavigate();
  const { needsOnboarding, loading: onboardingLoading, error: onboardingError } = useOnboardingRequired();
  
  // Enable realtime notifications for new customer submissions
  useSubmissionNotifications();

  // Session timeout: 30 min idle → expire, 5 min warning before
  const handleExpire = useCallback(() => {
    void signOut();
    navigate("/auth", { replace: true });
  }, [signOut, navigate]);

  const handleExtend = useCallback(async () => {
    await refreshSession();
  }, [refreshSession]);

  const {
    showWarning,
    formattedTime,
    extendSession,
    isExtending,
  } = useSessionTimeout({
    sessionTimeout: 30 * 60 * 1000,
    warningBefore: 5 * 60 * 1000,
    onExpire: handleExpire,
    onExtend: handleExtend,
    enabled: !!user,
  });

  // Redirect removed — ProtectedRoute handles auth gating

  // Only block on auth loading, NOT on role loading (role loads gracefully in background)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Redirect to onboarding if not completed
  if (!onboardingLoading && !onboardingError && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <SkipLink targetId="main-content" />
      
      <SessionWarningDialog
        isOpen={showWarning}
        timeRemaining={formattedTime}
        onExtend={extendSession}
        onLogout={() => void signOut()}
        isExtending={isExtending}
      />
      <SessionRefreshIndicator />
      <div className="min-h-screen flex w-full bg-background pt-0 has-[.demo-banner]:pt-10">
        {/* Sidebar is isolated so it never disappears due to content errors */}
        <IsolatedErrorBoundary 
          name="Sidebar"
          fallback={
            <div className="hidden md:flex flex-col w-16 h-screen bg-sidebar border-r border-sidebar-border items-center py-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.reload()}
                className="h-10 w-10"
                aria-label="Sidebar herladen"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          }
        >
          <AppSidebar />
        </IsolatedErrorBoundary>
        
        <main className="flex-1 flex flex-col relative min-w-0">
          {/* Header - Always visible, outside error boundary */}
          <header className="sticky flex items-center justify-between px-3 md:px-6 top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40" role="banner" style={{ minHeight: "3.25rem", paddingTop: "max(0px, env(safe-area-inset-top))" }}>
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-muted transition-colors flex-shrink-0" aria-label="Toggle sidebar menu">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div className="min-w-0">
                <h1 className="font-display text-lg font-semibold tracking-tight truncate">{title}</h1>
                {description && (
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">{description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Global Search */}
              <GlobalSearch />
              {/* Notification Center */}
              <NotificationBell />

              {/* Copilot Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCommandBar}
                      className="gap-1.5 h-8 px-2 sm:px-3 bg-muted/50 border-border/50 hover:bg-muted"
                    >
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="hidden sm:inline text-sm text-muted-foreground">Copilot</span>
                      <div className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Command className="w-3 h-3" />
                        <span>K</span>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open Copilot (⌘K)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {canAccessChatGPT && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-9 w-9"
                        aria-label="AI Assistent"
                      >
                        <Link to="/chatgpt">
                          <Bot className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI Assistent</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Role badge for debugging */}
              <div 
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10"
                role="status"
                aria-live="polite"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
                <span className="text-xs font-medium text-success">Verbonden</span>
              </div>
            </div>
          </header>
          
          {/* Content - isolated error boundary for page content */}
          <div id="main-content" className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto" tabIndex={-1} style={{ paddingBottom: "max(6rem, calc(1rem + env(safe-area-inset-bottom)))" }}>
            <SubscriptionGate>
              <IsolatedErrorBoundary name="PageContent">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  {children}
                </Suspense>
              </IsolatedErrorBoundary>
            </SubscriptionGate>
          </div>
        </main>
        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}

export default DashboardLayout;
