import { createFileRoute } from "@tanstack/react-router";
import { Gauge } from "lucide-react";

import { PaginaAnaliseVazia } from "@/components/painel/cabecalho-pagina";

export const Route = createFileRoute("/_painel/_analise/eficiencia")({
  head: () => ({ meta: [{ title: "Eficiência · Painel de Mecanizado" }] }),
  component: () => (
    <PaginaAnaliseVazia
      titulo="Eficiência"
      descricao="Custo por hora trabalhada e produtividade por ativo e grupo."
      icone={Gauge}
    />
  ),
});
