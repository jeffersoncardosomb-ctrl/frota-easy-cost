import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { Info, Loader2, LogOut, Moon, Sun, UserRound } from "lucide-react";

import { AppSidebar } from "@/components/painel/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { useTema } from "@/lib/tema";

export const Route = createFileRoute("/_painel")({
  component: LayoutPainel,
});

function LayoutPainel() {
  const { carregando, session, modoPreview } = useAuth();
  // resolvedLocation: a location pendente já seria /login e o redirect se aninharia em loop.
  const destino = useRouterState({ select: (s) => (s.resolvedLocation ?? s.location).href });

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Carregando" />
      </div>
    );
  }

  // Guarda o endereço (com filtros) para voltar a ele depois do login.
  if (!session && !modoPreview) {
    return <Navigate to="/login" search={{ redirect: destino }} replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <BarraSuperior />
        {modoPreview && (
          <div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-900 md:px-6 dark:bg-amber-950/40 dark:text-amber-200">
            <Info className="size-3.5 shrink-0" />
            Modo de pré-visualização: o Lovable Cloud ainda não está habilitado, então não há login
            nem dados.
          </div>
        )}
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

function BarraSuperior() {
  const { user, sair, isAdmin, modoPreview } = useAuth();
  const { tema, alternar } = useTema();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:px-4">
      <SidebarTrigger aria-label="Recolher menu" />
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={alternar}
          aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
        >
          {tema === "escuro" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        {!modoPreview && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <UserRound className="size-4" />
                <span className="hidden max-w-[200px] truncate sm:inline">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm font-medium">{user?.email}</div>
                <div className="text-xs text-muted-foreground">
                  {isAdmin ? "Administrador" : "Usuário"}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void sair()}>
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
