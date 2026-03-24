import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "./useUserRole";
import { useNotifications } from "@/components/notifications/NotificationCenter";
import { logger } from "@/lib/logger";

// Simple notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant two-tone notification
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      
      // Smooth fade in/out
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    playTone(587.33, now, 0.15); // D5
    playTone(880, now + 0.15, 0.2); // A5
    
  } catch (error) {
    logger.warn("Could not play notification sound:", error);
  }
};

export const useSubmissionNotifications = () => {
  const { toast } = useToast();
  const { isAdmin, isMedewerker } = useUserRole();
  const { addNotification } = useNotifications();
  const toastRef = useRef(toast);
  const addNotificationRef = useRef(addNotification);
  
  // Keep refs updated
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  useEffect(() => {
    // Only subscribe if user is admin or medewerker
    if (!isAdmin && !isMedewerker) return;

    const handleNewSubmission = (payload: any) => {
      const submission = payload.new as {
        pickup_company: string;
        delivery_company: string;
        pickup_city: string;
        delivery_city: string;
      };

      playNotificationSound();

      toastRef.current({
        title: "🔔 Nieuwe klant-aanvraag",
        description: `${submission.pickup_company} → ${submission.delivery_company} (${submission.pickup_city} - ${submission.delivery_city})`,
        duration: 8000,
      });

      addNotificationRef.current({
        type: 'order',
        title: 'Nieuwe klant-aanvraag',
        message: `${submission.pickup_company} → ${submission.delivery_company} (${submission.pickup_city} - ${submission.delivery_city})`,
        actionUrl: '/orders',
        actionLabel: 'Bekijk orders',
      });
    };

    const handleNewDocument = (payload: any) => {
      const doc = payload.new as {
        name: string;
        order_id: string;
      };

      playNotificationSound();

      toastRef.current({
        title: "📎 Document geüpload door chauffeur",
        description: `Nieuw document: ${doc.name || 'Onbekend bestand'}`,
        duration: 8000,
      });

      addNotificationRef.current({
        type: 'info',
        title: 'Document geüpload door chauffeur',
        message: `Nieuw document: ${doc.name || 'Onbekend bestand'}`,
      });
    };

    const channel = supabase
      .channel(`submission-notifications-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_submissions",
        },
        handleNewSubmission
      )
      .subscribe();

    const docChannel = supabase
      .channel(`driver-doc-upload-notifications-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_documents",
          filter: "document_type=eq.STOP_DOCUMENT",
        },
        handleNewDocument
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(docChannel);
    };
  }, [isAdmin, isMedewerker]);
};
