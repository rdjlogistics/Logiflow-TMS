import { useState } from 'react';
import { Bell, BellOff, Check, X, TestTube, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationSettings = () => {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    loading, 
    subscribe, 
    unsubscribe,
    sendLocalNotification 
  } = usePushNotifications();
  const [testSending, setTestSending] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      const success = await subscribe();
      if (!success) return;
    }
    
    setTestSending(true);
    
    // Small delay for effect
    setTimeout(() => {
      sendLocalNotification({
        title: '🚚 Test notificatie',
        body: 'Push notificaties werken correct!',
        tag: 'test-notification',
        data: { type: 'test' },
      });
      setTestSending(false);
    }, 500);
  };

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-foreground">Niet ondersteund</p>
            <p className="text-sm text-muted-foreground">
              Push notificaties worden niet ondersteund in deze browser
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4"
    >
      {/* Main toggle */}
      <div className="p-4 rounded-xl bg-card/50 border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isSubscribed ? 'bg-primary/10' : 'bg-muted/50'
            }`}>
              {isSubscribed ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">Push notificaties</p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed 
                  ? 'Je ontvangt meldingen voor nieuwe ritten'
                  : 'Ontvang meldingen voor nieuwe ritten'
                }
              </p>
            </div>
          </div>
          
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading || permission === 'denied'}
          />
        </div>

        {/* Permission denied warning */}
        {permission === 'denied' && (
          <div
            className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <p className="text-sm text-destructive">
              Notificaties zijn geblokkeerd. Wijzig dit in je browserinstellingen.
            </p>
          </div>
        )}

        {/* Success state */}
        {isSubscribed && (
          <div
            className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-emerald-400">
                Push notificaties zijn actief
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Test button */}
      {isSubscribed && (
        <div
        >
          <Button
            variant="outline"
            onClick={handleTestNotification}
            disabled={testSending}
            className="w-full"
          >
            {testSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verzenden...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Test notificatie versturen
              </>
            )}
          </Button>
        </div>
      )}

      {/* Info text */}
      <p className="text-xs text-muted-foreground text-center px-4">
        Je ontvangt instant een melding wanneer er een nieuwe rit aan je wordt toegewezen, 
        ook als de app niet open is.
      </p>
    </div>
  );
};
