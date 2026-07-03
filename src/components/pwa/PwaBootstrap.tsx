import { useEffect } from "react";
import { toast } from "sonner";
import { getOfflinePrecCadastroCount, notifyBrowser, syncPendingPrecCadastros } from "@/utils/offlinePrecCadastro";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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

    const installDismissedKey = "checkin-lusitania-install-dismissed";
    const installAcceptedKey = "checkin-lusitania-install-accepted";

    let deferredPrompt: BeforeInstallPromptEvent | null = null;

    const openInstallPrompt = async () => {
      if (!deferredPrompt) return;

      const promptEvent = deferredPrompt;
      deferredPrompt = null;

      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      if (choice.outcome === "accepted") {
        window.localStorage.setItem(installAcceptedKey, "1");
        toast.success("Aplicativo instalado", {
          description: "O Check-in Lusitânia agora pode ser aberto direto no celular.",
        });
      } else {
        window.localStorage.setItem(installDismissedKey, "1");
      }
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;

      const alreadyAccepted = window.localStorage.getItem(installAcceptedKey) === "1";
      const alreadyDismissed = window.localStorage.getItem(installDismissedKey) === "1";

      if (alreadyAccepted || alreadyDismissed) return;

      toast("Instale o app no celular", {
        description: "Use o sistema com atalho na tela inicial e experiência mais rápida.",
        duration: 20000,
        action: {
          label: "Instalar",
          onClick: () => {
            void openInstallPrompt();
          },
        },
        cancel: {
          label: "Agora não",
          onClick: () => {
            window.localStorage.setItem(installDismissedKey, "1");
          },
        },
      });
    };

    const onAppInstalled = () => {
      window.localStorage.setItem(installAcceptedKey, "1");
      window.localStorage.removeItem(installDismissedKey);
    };

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
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    onOnline();

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  return null;
}
