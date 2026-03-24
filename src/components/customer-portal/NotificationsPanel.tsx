import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Bell,
  Package,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CheckCheck,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type { CustomerNotification } from "@/hooks/useCustomerPortal";
import { cn } from "@/lib/utils";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: CustomerNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNotificationClick: (notification: CustomerNotification) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'booking_received':
      return { icon: Package, color: 'text-primary bg-primary/10' };
    case 'status_change':
      return { icon: Truck, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' };
    case 'delivered':
      return { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400 bg-green-500/10' };
    case 'contract_pending':
      return { icon: FileText, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' };
    case 'invoice_sent':
      return { icon: FileText, color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' };
    case 'waiting_started':
      return { icon: Clock, color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10' };
    case 'exception':
      return { icon: AlertCircle, color: 'text-red-600 dark:text-red-400 bg-red-500/10' };
    default:
      return { icon: Bell, color: 'text-muted-foreground bg-muted' };
  }
};

export const NotificationsPanel = ({
  open,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
}: NotificationsPanelProps) => {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle>Notificaties</SheetTitle>
                <SheetDescription>
                  {unreadCount > 0 
                    ? `${unreadCount} ongelezen ${unreadCount === 1 ? 'bericht' : 'berichten'}`
                    : 'Geen nieuwe berichten'
                  }
                </SheetDescription>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllRead}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Alles gelezen
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Geen notificaties</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const { icon: Icon, color } = getNotificationIcon(notification.notification_type);
                const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                  locale: nl,
                });

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                      !notification.is_read && "bg-primary/5"
                    )}
                    onClick={() => {
                      if (!notification.is_read) {
                        onMarkRead(notification.id);
                      }
                      onNotificationClick(notification);
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={cn("p-2 rounded-xl shrink-0 h-fit", color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        {notification.body && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {timeAgo}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsPanel;
