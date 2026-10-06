import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

import { PaginaAnaliseVazia } from "@/components/painel/cabecalho-pagina";

export const Route = createFileRoute("/_painel/_analise/visao-geral")({
  head: () => ({ meta: [{ title: "Visão geral · Painel de Mecanizado" }] }),
  component: () => (
    <PaginaAnaliseVazia
      titulo="Visão geral"
      descricao="Resumo do custo da frota, máquinas e implementos no período."
      icone={LayoutDashboard}
    />
  ),
});
