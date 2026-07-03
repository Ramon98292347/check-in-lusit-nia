import { useEffect } from "react";
import { toast } from "sonner";
import { getOfflinePrecCadastroCount, notifyBrowser, syncPendingPrecCadastros } from "@/utils/offlinePrecCadastro";

export function PwaBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!import.meta.env.PROD) {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch(() => {
              // ignora falhas silenciosamente
            });
          });
        });
      }
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ignora falhas silenciosamente
      });
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {
        // ignora falhas silenciosamente
      });
    }

    const onOffline = () => {
      toast.info("Modo offline ativado", {
        description: "O pré-cadastro pode ser salvo offline e sincronizado depois.",
      });
      notifyBrowser("Modo offline ativado", "Os próximos pré-cadastros podem ser guardados no aparelho.");
    };

    const onOnline = async () => {
      const pending = getOfflinePrecCadastroCount();
      if (pending === 0) return;

      const result = await syncPendingPrecCadastros();
      if (result.synced > 0) {
        toast.success("Pré-cadastros sincronizados", {
          description: `${result.synced} cadastro(s) offline foram enviados para o sistema.`,
        });
        notifyBrowser("Pré-cadastros sincronizados", `${result.synced} cadastro(s) offline foram enviados.`);
      }

      if (result.failed > 0) {
        toast.error("Alguns cadastros ainda estão pendentes", {
          description: `${result.failed} cadastro(s) continuam aguardando conexão estável.`,
        });
      }
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    onOnline();

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
