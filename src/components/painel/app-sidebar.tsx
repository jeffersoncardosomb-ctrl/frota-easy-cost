import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ClipboardCheck,
  Database,
  FileUp,
  Gauge,
  LayoutDashboard,
  Sprout,
  TrendingUp,
  Tractor,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { validarFiltrosSearch } from "@/lib/filtros";

type ItemMenu = { titulo: string; to: string; icone: LucideIcon };

const ANALISE: ItemMenu[] = [
  { titulo: "Visão geral", to: "/visao-geral", icone: LayoutDashboard },
  { titulo: "Tendência", to: "/tendencia", icone: TrendingUp },
  { titulo: "Eficiência", to: "/eficiencia", icone: Gauge },
  { titulo: "Manutenção", to: "/manutencao", icone: Wrench },
  { titulo: "Ativos", to: "/ativos", icone: Tractor },
  { titulo: "Qualidade dos dados", to: "/qualidade-dados", icone: ClipboardCheck },
];

const ADMIN: ItemMenu[] = [
  { titulo: "Cadastros", to: "/admin/cadastros", icone: Database },
  { titulo: "Importar", to: "/admin/importar", icone: FileUp },
];

export function AppSidebar() {
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/visao-geral"
          className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 group-data-[collapsible=icon]:px-0"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sprout className="size-4.5" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Painel de Mecanizado</span>
            <span className="truncate text-xs text-muted-foreground">Custo de frota</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Análise</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ANALISE.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to} tooltip={item.titulo}>
                    {/* Mantém o recorte atual (filtros da URL) ao trocar de tela. */}
                    <Link
                      to={item.to}
                      search={(prev: Record<string, unknown>) => validarFiltrosSearch(prev)}
                    >
                      <item.icone />
                      <span>{item.titulo}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administração</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.to}
                        tooltip={item.titulo}
                      >
                        <Link to={item.to}>
                          <item.icone />
                          <span>{item.titulo}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <Activity className="size-3.5" />
          Frota · máquinas · implementos
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
