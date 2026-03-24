import { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Save, 
  SaveAll, 
  FileText, 
  CheckCircle, 
  Copy, 
  Map, 
  FilePlus, 
  Paperclip,
  History,
  MoreHorizontal,
  Send,
  Package,
  User,
  MessageCircle,
  Phone,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrderActionBarProps {
  onSave: () => void;
  onSaveAndClose: () => void;
  onConvertToQuote: () => void;
  onMarkComplete: () => void;
  onDuplicate: () => void;
  onShowRoute: () => void;
  onCreateDocument: () => void;
  onAttachDocument: () => void;
  onShowTimeline: () => void;
  onDispatchOrder?: () => void;
  onShowGoods?: () => void;
  onSendToDriver?: () => void;
  onMarkVerified?: () => void;
  hasDriverWithPortal?: boolean;
  driverPhone?: string;
  onWhatsAppDriver?: () => void;
  onSmsDriver?: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
  hasDispatch?: boolean;
}

const OrderActionBar = ({
  onSave,
  onSaveAndClose,
  onConvertToQuote,
  onMarkComplete,
  onDuplicate,
  onShowRoute,
  onCreateDocument,
  onAttachDocument,
  onShowTimeline,
  onDispatchOrder,
  onShowGoods,
  onSendToDriver,
  onMarkVerified,
  hasDriverWithPortal = false,
  driverPhone,
  onWhatsAppDriver,
  onSmsDriver,
  isSubmitting,
  isEditMode,
  hasDispatch = false,
}: OrderActionBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);

  // Publish actual bar height as CSS custom property for dynamic bottom padding
  const publishHeight = useCallback(() => {
    if (barRef.current) {
      const h = barRef.current.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--action-bar-h', `${h}px`);
    }
  }, []);

  useEffect(() => {
    publishHeight();
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(publishHeight);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty('--action-bar-h'); };
  }, [publishHeight]);

  return (
    <div ref={barRef} className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 shadow-xl z-50 pb-safe">
      <div className="max-w-[1800px] mx-auto px-3 py-3 md:px-4 md:py-3">
        {/* Mobile Layout - iOS optimized with 44px+ touch targets */}
        <div className="flex md:hidden items-center justify-between gap-2">
          {/* Primary actions - always visible */}
          <div className="flex items-center gap-2 flex-1">
            <Button
              onClick={onSave}
              disabled={isSubmitting}
              size="sm"
              className="gap-1.5 flex-1 max-w-[130px] h-11 text-sm touch-manipulation active:scale-[0.97] transition-transform"
            >
              <Save className="h-4 w-4" />
              <span>Opslaan</span>
            </Button>

            <Button
              onClick={onSaveAndClose}
              disabled={isSubmitting}
              variant="secondary"
              size="sm"
              className="gap-1.5 flex-1 max-w-[160px] h-11 text-sm touch-manipulation active:scale-[0.97] transition-transform"
            >
              <SaveAll className="h-4 w-4" />
              <span>Opslaan & Sluiten</span>
            </Button>
          </div>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-11 w-11 p-0 touch-manipulation active:scale-[0.95] transition-transform">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={12} collisionPadding={16} className="mb-1 w-56">
              <DropdownMenuItem onClick={onConvertToQuote}>
                <FileText className="h-4 w-4 mr-2" />
                Omzetten naar offerte
              </DropdownMenuItem>
              
              {isEditMode && (
                <DropdownMenuItem onClick={onMarkComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Afmelden
                </DropdownMenuItem>
              )}
              
              {isEditMode && onMarkVerified && (
                <DropdownMenuItem onClick={onMarkVerified}>
                  <Shield className="h-4 w-4 mr-2" />
                  Gecontroleerd
                </DropdownMenuItem>
              )}
              {isEditMode && onDispatchOrder && !hasDispatch && (
                <DropdownMenuItem onClick={onDispatchOrder}>
                  <Send className="h-4 w-4 mr-2" />
                   Uitbesteden aan charter
                </DropdownMenuItem>
              )}
              
              {isEditMode && onSendToDriver && hasDriverWithPortal && (
                <DropdownMenuItem onClick={onSendToDriver}>
                  <User className="h-4 w-4 mr-2" />
                   Stuur naar eigen chauffeur
                </DropdownMenuItem>
              )}

              {isEditMode && driverPhone && onWhatsAppDriver && (
                <DropdownMenuItem onClick={onWhatsAppDriver}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                   WhatsApp eigen chauffeur
                </DropdownMenuItem>
              )}

              {isEditMode && driverPhone && onSmsDriver && (
                <DropdownMenuItem onClick={onSmsDriver}>
                  <Phone className="h-4 w-4 mr-2" />
                   SMS eigen chauffeur
                </DropdownMenuItem>
              )}
              
              {isEditMode && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Dupliceren
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {isEditMode && onShowGoods && (
                <DropdownMenuItem onClick={onShowGoods}>
                  <Package className="h-4 w-4 mr-2" />
                  Goederen
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={onShowRoute}>
                <Map className="h-4 w-4 mr-2" />
                Route weergeven
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={onCreateDocument}>
                <FilePlus className="h-4 w-4 mr-2" />
                Document aanmaken
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={onAttachDocument}>
                <Paperclip className="h-4 w-4 mr-2" />
                Document bijvoegen
              </DropdownMenuItem>
              
              {isEditMode && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onShowTimeline}>
                    <History className="h-4 w-4 mr-2" />
                    Track & Trace historie
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex flex-wrap items-center gap-2 justify-center lg:justify-start">
          <Button
            onClick={onSave}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Opslaan
          </Button>

          <Button
            onClick={onSaveAndClose}
            disabled={isSubmitting}
            variant="secondary"
            className="gap-2"
          >
            <SaveAll className="h-4 w-4" />
            Opslaan & Sluiten
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          <Button
            onClick={onConvertToQuote}
            variant="outline"
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Omzetten naar offerte
          </Button>

          {isEditMode && (
            <Button
              onClick={onMarkComplete}
              variant="outline"
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Afmelden
            </Button>
          )}

          {isEditMode && onMarkVerified && (
            <Button
              onClick={onMarkVerified}
              variant="outline"
              className="gap-2 text-purple-600 border-purple-500/50 hover:bg-purple-500/10"
            >
              <Shield className="h-4 w-4" />
              Gecontroleerd
            </Button>
          )}

          {isEditMode && (
            <Button
              onClick={onDuplicate}
              variant="outline"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Dupliceren
            </Button>
          )}

          {isEditMode && onDispatchOrder && !hasDispatch && (
            <>
              <div className="h-6 w-px bg-border mx-1" />
              <Button
                onClick={onDispatchOrder}
                variant="outline"
                className="gap-2 text-primary border-primary/50 hover:bg-primary/10"
              >
                <Send className="h-4 w-4" />
                Uitbesteden aan charter
              </Button>
            </>
          )}

          {isEditMode && ((onSendToDriver && hasDriverWithPortal) || (driverPhone && (onWhatsAppDriver || onSmsDriver))) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 text-green-600 border-green-500/50 hover:bg-green-500/10"
                >
                  <User className="h-4 w-4" />
                  Eigen chauffeur
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" sideOffset={12} collisionPadding={16} className="mb-1 w-52">
                {onSendToDriver && hasDriverWithPortal && (
                  <DropdownMenuItem onClick={onSendToDriver}>
                    <Send className="h-4 w-4 mr-2" />
                    Stuur naar eigen chauffeur
                  </DropdownMenuItem>
                )}
                {driverPhone && onWhatsAppDriver && (
                  <DropdownMenuItem onClick={onWhatsAppDriver}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp eigen chauffeur
                  </DropdownMenuItem>
                )}
                {driverPhone && onSmsDriver && (
                  <DropdownMenuItem onClick={onSmsDriver}>
                    <Phone className="h-4 w-4 mr-2" />
                    SMS eigen chauffeur
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="h-6 w-px bg-border mx-1" />

          {isEditMode && onShowGoods && (
            <Button
              onClick={onShowGoods}
              variant="outline"
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              Goederen
            </Button>
          )}

          <Button
            onClick={onShowRoute}
            variant="outline"
            className="gap-2"
          >
            <Map className="h-4 w-4" />
            Route weergeven
          </Button>

          <Button
            onClick={onCreateDocument}
            variant="outline"
            className="gap-2"
          >
            <FilePlus className="h-4 w-4" />
            Document aanmaken
          </Button>

          <Button
            onClick={onAttachDocument}
            variant="outline"
            className="gap-2"
          >
            <Paperclip className="h-4 w-4" />
            Document bijvoegen
          </Button>

          {isEditMode && (
            <Button
              onClick={onShowTimeline}
              variant="outline"
              className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
            >
              <History className="h-4 w-4" />
              Track & Trace
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderActionBar;
