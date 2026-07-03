import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (loading || !user || typeof window === "undefined") return;

    const storageKey = "checkin-lusitania-ultimo-precadastro";
    let ativo = true;

    const solicitarPermissao = async () => {
      if ("Notification" in window && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignora falhas de permissão silenciosamente.
        }
      }
    };

    const verificarNovosCadastros = async (primeiraCarga = false) => {
      const { data } = await supabase
        .from("hospedagens")
        .select("id, criado_em, hospede:hospedes(nome)")
        .eq("status", "pre_cadastro")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ativo || !data?.id || !data?.criado_em) return;

      const marcadorAtual = `${data.id}:${data.criado_em}`;
      const marcadorAnterior = window.localStorage.getItem(storageKey);

      if (!marcadorAnterior || primeiraCarga) {
        window.localStorage.setItem(storageKey, marcadorAtual);
        return;
      }

      if (marcadorAtual !== marcadorAnterior) {
        window.localStorage.setItem(storageKey, marcadorAtual);
        const nomeHospede = data.hospede?.nome || "Novo hóspede";
        const mensagem = `${nomeHospede} enviou um novo pré-cadastro.`;

        toast.success("Novo pré-cadastro recebido", {
          description: mensagem,
          duration: 8000,
        });

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Novo pré-cadastro recebido", {
            body: mensagem,
          });
        }
      }
    };

    solicitarPermissao();
    verificarNovosCadastros(true);

    const intervalo = window.setInterval(() => {
      verificarNovosCadastros(false);
    }, 15000);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="h-14 flex items-center gap-2 border-b bg-card/50 backdrop-blur px-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="font-serif text-lg text-foreground">Check-in Lusitânia</div>
          </header>
          <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
