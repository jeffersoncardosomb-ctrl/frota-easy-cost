import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

import { PaginaAnaliseVazia } from "@/components/painel/cabecalho-pagina";

export const Route = createFileRoute("/_painel/_analise/manutencao")({
  head: () => ({ meta: [{ title: "Manutenção · Painel de Mecanizado" }] }),
  component: () => (
    <PaginaAnaliseVazia
      titulo="Manutenção"
      descricao="Gastos com manutenção, peças e serviços."
      icone={Wrench}
    />
  ),
});
