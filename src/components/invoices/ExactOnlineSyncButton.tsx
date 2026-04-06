import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExactOnlineSyncButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  exactOnlineId?: string | null;
  size?: "sm" | "default";
}

export function ExactOnlineSyncButton({
  invoiceId,
  invoiceNumber,
  exactOnlineId,
  size = "sm",
}: ExactOnlineSyncButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("exact-sync-invoices", {
        body: { invoiceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      if (data?.synced > 0) {
        toast({
          title: "Gesynchroniseerd",
          description: `Factuur ${invoiceNumber} is geëxporteerd naar Exact Online.`,
        });
      } else if (data?.errors?.length > 0) {
        toast({
          title: "Sync fout",
          description: data.errors[0],
          variant: "destructive",
        });
      } else if (data?.integration_ready) {
        toast({
          title: "Koppeling gereed",
          description: "Exact Online is verbonden. Configureer API-credentials om facturen te exporteren.",
        });
      } else {
        toast({
          title: "Niet geconfigureerd",
          description: "Configureer eerst de Exact Online koppeling via Instellingen.",
        });
      }
    },
    onError: (error: Error) => {
      const isMissingKeys = error.message?.includes("API keys");
      const isNotActive = error.message?.includes("niet actief");
      toast({
        title: isMissingKeys
          ? "Exact Online niet geconfigureerd"
          : isNotActive
          ? "Koppeling niet actief"
          : "Sync mislukt",
        description: isMissingKeys
          ? "Activeer de Exact Online koppeling via Instellingen > Boekhouding."
          : error.message,
        variant: "destructive",
      });
    },
  });

  if (exactOnlineId) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
        <CheckCircle className="h-3.5 w-3.5" />
        <span>Exact Online</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={() => syncMutation.mutate()}
      disabled={syncMutation.isPending}
      className="gap-2 text-xs"
    >
      {syncMutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Calculator className="h-3.5 w-3.5" />
      )}
      Export naar Exact
    </Button>
  );
}