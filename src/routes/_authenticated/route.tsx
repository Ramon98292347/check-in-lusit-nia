import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, DesktopHeaderNav, MobileBottomNav } from "@/components/layout/AppSidebar";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const userInitials = user?.nome
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CL";

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
        <div className="md:hidden">
          <AppSidebar />
        </div>
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-20 flex h-13 items-center gap-2 border-b bg-card/80 px-3 backdrop-blur md:px-4">
            <SidebarTrigger className="inline-flex md:hidden" />
            <div className="min-w-0 flex-1 truncate font-serif text-sm text-foreground md:text-lg">
              Check-in Lusitânia
            </div>
            <DesktopHeaderNav />
            <Avatar className="h-9 w-9 border border-border/70 bg-primary/5 md:hidden">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </header>
          <main className="mx-auto w-full max-w-full flex-1 p-2 pb-24 sm:p-3 md:max-w-7xl md:p-6 md:pb-6">
            <Outlet />
          </main>
          <MobileBottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
