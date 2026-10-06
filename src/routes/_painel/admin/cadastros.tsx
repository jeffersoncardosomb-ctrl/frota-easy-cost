import { createFileRoute } from "@tanstack/react-router";
import { Database } from "lucide-react";

import { PaginaAdminVazia } from "@/components/painel/cabecalho-pagina";

export const Route = createFileRoute("/_painel/admin/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros · Painel de Mecanizado" }] }),
  component: () => (
    <PaginaAdminVazia
      titulo="Cadastros"
      descricao="Usuários convidados, grupos e ativos."
      icone={Database}
    />
  ),
});
