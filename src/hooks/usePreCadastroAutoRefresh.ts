import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type Options = {
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
  intervalMs?: number;
};

export function usePreCadastroAutoRefresh({ onRefresh, enabled = true, intervalMs = 15000 }: Options) {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let ativo = true;

    const triggerRefresh = () => {
      if (!ativo) return;
      void refreshRef.current();
    };

    const channel = supabase
      .channel("hospedagens-pre-cadastro-auto-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hospedagens" },
        triggerRefresh,
      )
      .subscribe();

    const intervalo = window.setInterval(triggerRefresh, intervalMs);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      void supabase.removeChannel(channel);
    };
  }, [enabled, intervalMs]);
}
