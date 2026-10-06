import { createFileRoute } from "@tanstack/react-router";
import { FileUp } from "lucide-react";

import { PaginaAdminVazia } from "@/components/painel/cabecalho-pagina";

export const Route = createFileRoute("/_painel/admin/importar")({
  head: () => ({ meta: [{ title: "Importar · Painel de Mecanizado" }] }),
  component: () => (
    <PaginaAdminVazia
      titulo="Importar"
      descricao="Carga mensal das planilhas de custo e horas."
      icone={FileUp}
    />
  ),
});
