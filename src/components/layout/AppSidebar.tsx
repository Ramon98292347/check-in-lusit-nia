import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  BedDouble,
  ClipboardCheck,
  FileText,
  Settings,
  LogOut,
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

const logoUrl = "/Captura%20de%20tela%202026-07-03%20124733.png";

const items = [
  { title: "Painel", url: "/painel", icon: LayoutDashboard },
  { title: "Pré-cadastros", url: "/precadastros", icon: ClipboardList },
  { title: "Hospedagens", url: "/hospedagens", icon: BedDouble },
  { title: "Vistorias", url: "/vistorias", icon: ClipboardCheck },
  { title: "Documentos", url: "/documentos", icon: FileText },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
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
          <div className="grid h-10 w-16 shrink-0 place-items-center rounded-lg bg-sidebar-primary/10 overflow-hidden">
            <img src={logoUrl} alt="Pousada Lusitânia" className="h-10 w-full object-contain" />
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
