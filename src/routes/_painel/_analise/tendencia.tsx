import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";

import { PaginaAnaliseVazia } from "@/components/painel/cabecalho-pagina";

export const Route = createFileRoute("/_painel/_analise/tendencia")({
  head: () => ({ meta: [{ title: "Tendência · Painel de Mecanizado" }] }),
  component: () => (
    <PaginaAnaliseVazia
      titulo="Tendência"
      descricao="Evolução mensal dos custos e comparação entre períodos."
      icone={TrendingUp}
    />
  ),
});
