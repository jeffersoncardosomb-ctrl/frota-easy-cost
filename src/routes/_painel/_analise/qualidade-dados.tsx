import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";

import { PaginaAnaliseVazia } from "@/components/painel/cabecalho-pagina";

export const Route = createFileRoute("/_painel/_analise/qualidade-dados")({
  head: () => ({ meta: [{ title: "Qualidade dos dados · Painel de Mecanizado" }] }),
  component: () => (
    <PaginaAnaliseVazia
      titulo="Qualidade dos dados"
      descricao="Lançamentos inconsistentes, sem grupo ou sem horas apontadas."
      icone={ClipboardCheck}
    />
  ),
});
