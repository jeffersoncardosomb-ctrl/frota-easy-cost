import { createFileRoute } from "@tanstack/react-router";
import { Tractor } from "lucide-react";

import { PaginaAnaliseVazia } from "@/components/painel/cabecalho-pagina";

export const Route = createFileRoute("/_painel/_analise/ativos")({
  head: () => ({ meta: [{ title: "Ativos · Painel de Mecanizado" }] }),
  component: () => (
    <PaginaAnaliseVazia
      titulo="Ativos"
      descricao="Detalhamento por patrimônio: custos, horas e histórico."
      icone={Tractor}
    />
  ),
});
