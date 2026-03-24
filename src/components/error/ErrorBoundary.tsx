import { Component, ReactNode, ErrorInfo, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug, Wifi, WifiOff } from 'lucide-react';
import { logger } from '@/lib/logger';
import { reportError } from '@/lib/errorReporter';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Reset keys that trigger automatic reset */
  resetKeys?: unknown[];
  /** Enable automatic retry after a delay */
  autoRetry?: boolean;
  /** Delay before auto-retry in ms (default: 3000) */
  autoRetryDelay?: number;
  /** Maximum auto-retry attempts (default: 3) */
  maxAutoRetries?: number;
  /** Isolate this boundary - errors won't propagate up */
  isolate?: boolean;
  /** Custom component name for logging */
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isAutoRetrying: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      isAutoRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    const { componentName, autoRetry, autoRetryDelay = 3000, maxAutoRetries = 3 } = this.props;
    
    // Log error with context
    logger.error(
      `ErrorBoundary caught error${componentName ? ` in ${componentName}` : ''}`,
      'ErrorBoundary',
      { error: error.message, stack: error.stack }
    );
    
    // Report to backend error tracking
    reportError(error, {
      componentName: componentName || 'Unknown',
      metadata: {
        componentStack: errorInfo.componentStack?.slice(0, 1000),
        retryCount: this.state.retryCount,
      },
    });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    
    // Auto-retry logic
    if (autoRetry && this.state.retryCount < maxAutoRetries) {
      this.setState({ isAutoRetrying: true });
      this.retryTimeoutId = setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
          isAutoRetrying: false,
        }));
      }, autoRetryDelay);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKeys) {
      // Check if any reset key changed
      const keysChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      
      if (keysChanged) {
        this.reset();
      }
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  reset = (): void => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      isAutoRetrying: false,
    });
  };

  render(): ReactNode {
    const { maxAutoRetries = 3 } = this.props;
    
    if (this.state.hasError) {
      // Show auto-retry indicator
      if (this.state.isAutoRetrying) {
        return (
          <AutoRetryIndicator 
            retryCount={this.state.retryCount}
            maxRetries={maxAutoRetries}
          />
        );
      }
      
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.reset}
          retryCount={this.state.retryCount}
          maxRetries={maxAutoRetries}
        />
      );
    }

    return this.props.children;
  }
}

// Auto-retry loading indicator
function AutoRetryIndicator({ retryCount, maxRetries }: { retryCount: number; maxRetries: number }) {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Automatisch herstellen...</p>
          <p className="text-xs text-muted-foreground">
            Poging {retryCount + 1} van {maxRetries}
          </p>
        </div>
      </div>
    </div>
  );
}

// Default error fallback UI - Premium styled
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  retryCount?: number;
  maxRetries?: number;
}

function ErrorFallback({ error, errorInfo, onReset, retryCount = 0, maxRetries = 3 }: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV;
  const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network');

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Premium error icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-destructive/20 rounded-2xl blur-xl" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/10 border border-destructive/20 flex items-center justify-center backdrop-blur-sm">
            {isNetworkError ? (
              <WifiOff className="h-10 w-10 text-destructive" />
            ) : (
              <AlertTriangle className="h-10 w-10 text-destructive" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {isNetworkError ? 'Verbindingsprobleem' : 'Er is iets misgegaan'}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {isNetworkError 
              ? 'Controleer je internetverbinding en probeer opnieuw.'
              : 'We hebben een onverwachte fout ondervonden. Probeer de pagina te verversen of ga terug naar het dashboard.'
            }
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Automatische pogingen: {retryCount}/{maxRetries}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={onReset} 
            className="gap-2 h-11 px-6 touch-manipulation"
            aria-label="Probeer de pagina opnieuw te laden"
          >
            <RefreshCw className="h-4 w-4" />
            Opnieuw proberen
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'} 
            className="gap-2 h-11 px-6 touch-manipulation"
            aria-label="Terug naar het dashboard"
          >
            <Home className="h-4 w-4" />
            Naar Dashboard
          </Button>
        </div>

        {isDev && error && (
          <details className="mt-6 text-left p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <summary className="cursor-pointer text-sm font-medium flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bug className="h-4 w-4" />
              Developer Details
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Error Message</p>
                <pre className="text-xs bg-background/50 p-3 rounded-xl overflow-auto font-mono border border-border/30">
                  {error.message}
                </pre>
              </div>
              {error.stack && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stack Trace</p>
                  <pre className="text-xs bg-background/50 p-3 rounded-xl overflow-auto max-h-48 font-mono border border-border/30">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Component Stack</p>
                  <pre className="text-xs bg-background/50 p-3 rounded-xl overflow-auto max-h-48 font-mono border border-border/30">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Support link */}
        <p className="text-xs text-muted-foreground pt-4">
          Blijft dit probleem zich voordoen?{" "}
          <a href="mailto:support@logiflow.nl" className="text-primary hover:underline">
            Neem contact op met support
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Isolated Error Boundary - errors don't propagate up
 * Perfect for independent sections of the UI
 */
interface IsolatedErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

export function IsolatedErrorBoundary({ children, fallback, name }: IsolatedErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={fallback || <CompactErrorFallback />}
      isolate
      autoRetry
      autoRetryDelay={2000}
      maxAutoRetries={2}
      componentName={name}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Compact error fallback for isolated sections
 */
function CompactErrorFallback() {
  return (
    <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-center">
      <p className="text-sm text-muted-foreground">
        Dit onderdeel kon niet worden geladen
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Verversen
      </Button>
    </div>
  );
}

/**
 * Route-level error boundary with automatic recovery on navigation
 */
interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeKey?: string;
}

export function RouteErrorBoundary({ children, routeKey }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary
      resetKeys={[routeKey]}
      autoRetry
      autoRetryDelay={3000}
      maxAutoRetries={3}
      componentName={`Route:${routeKey || 'unknown'}`}
    >
      <Suspense fallback={<SuspenseFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function SuspenseFallback() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  options?: Partial<ErrorBoundaryProps>
) {
  const displayName = Component.displayName || Component.name || 'Component';
  
  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary 
        fallback={fallback} 
        componentName={displayName}
        {...options}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  
  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return WithErrorBoundary;
}

/**
 * HOC for isolated error boundary
 */
export function withIsolatedErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const displayName = Component.displayName || Component.name || 'Component';
  
  function WithIsolatedErrorBoundary(props: P) {
    return (
      <IsolatedErrorBoundary fallback={fallback} name={displayName}>
        <Component {...props} />
      </IsolatedErrorBoundary>
    );
  }
  
  WithIsolatedErrorBoundary.displayName = `withIsolatedErrorBoundary(${displayName})`;
  
  return WithIsolatedErrorBoundary;
}
