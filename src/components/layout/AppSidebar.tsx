import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  LogOut,
  ExternalLink,
  Copy,
  Share2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const logoUrl = "/logo.png";

export const items = [
  { title: "Painel", url: "/painel", icon: LayoutDashboard },
  { title: "Ficha de Hóspede", url: "/precadastros", icon: ClipboardList },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-sidebar-primary/10">
            <img src={logoUrl} alt="Pousada Lusitânia" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-serif text-sm font-semibold text-sidebar-foreground truncate">
                Check-in Lusitânia
              </div>
              <div className="text-[10px] uppercase tracking-wider text-sidebar-accent-foreground/70">
                Pousada Lusitânia
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const active = path === it.url || path.startsWith(it.url + "/");
                return (
                  <SidebarMenuItem key={it.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.url} className="flex items-center gap-2">
                        <it.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{it.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && user && (
          <div className="px-2 pb-2 text-xs text-sidebar-accent-foreground/80">
            <div className="truncate font-medium">{user.nome}</div>
            <div className="truncate opacity-80">{user.username}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-80">
              {role === "administrador" ? "Administrador" : "Funcionário"}
            </div>
          </div>
        )}
        <SidebarMenuButton
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}

export function MobileBottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:hidden">
      <div className="grid grid-cols-3 gap-2 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-3">
        {items.map((it) => {
          const active = path === it.url || path.startsWith(it.url + "/");
          return (
            <Link
              key={it.url}
              to={it.url}
              title={it.title}
              aria-label={it.title}
              className={`flex min-h-16 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <it.icon className="h-5 w-5 shrink-0" />
            </Link>
          );
        })}
        <button
          type="button"
          title="Sair"
          aria-label="Sair"
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth" });
          }}
          className="flex min-h-16 flex-col items-center justify-center rounded-xl px-1 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
        </button>
      </div>
    </nav>
  );
}

export function DesktopHeaderNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();
  const [publicUrl, setPublicUrl] = useState("/precadastro");
  const [copied, setCopied] = useState(false);
  const userInitials = user?.nome
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CL";

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/precadastro`);
    }
  }, []);

  const copiarLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const compartilharLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Pré-cadastro Pousada Lusitânia",
        text: "Abra o formulário público de pré-cadastro.",
        url: publicUrl,
      });
      return;
    }

    await copiarLink();
  };

  return (
    <div className="hidden items-center gap-3 md:flex">
      <nav className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 p-1">
        {items.map((it) => {
          const active = path === it.url || path.startsWith(it.url + "/");
          return (
            <Link
              key={it.url}
              to={it.url}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <it.icon className="h-4 w-4" />
              <span>{it.title}</span>
            </Link>
          );
        })}
      </nav>

      <Button asChild className="rounded-full">
        <Link to="/precadastro">
          <ExternalLink className="h-4 w-4" />
          Criar cadastro
        </Link>
      </Button>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copiarLink}
          className={copied ? "border-primary bg-primary/10 text-primary shadow-sm" : ""}
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copiado!" : "Copiar link"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={compartilharLink}>
          <Share2 className="h-4 w-4" />
          Compartilhar
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background/80 px-3 py-2">
        <Avatar className="h-9 w-9 border border-border/70 bg-primary/5">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="max-w-32 truncate text-sm font-medium">{user?.nome}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {role === "administrador" ? "Administrador" : "Funcionário"}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}
