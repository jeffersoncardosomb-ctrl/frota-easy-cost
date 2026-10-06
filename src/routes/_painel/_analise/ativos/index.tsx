import { createFileRoute, Link } from "@tanstack/react-router";
import { Tractor, X } from "lucide-react";

import { PaginaAnaliseVazia } from "@/components/painel/cabecalho-pagina";
import { Badge } from "@/components/ui/badge";
import { ALERTA_POR_SLUG, validarBuscaAtivos } from "@/lib/busca-ativos";

export const Route = createFileRoute("/_painel/_analise/ativos/")({
  validateSearch: validarBuscaAtivos,
  head: () => ({ meta: [{ title: "Ativos · Painel de Mecanizado" }] }),
  component: Ativos,
});

function Ativos() {
  // O router mescla a query bruta por baixo da validada; validamos de novo.
  const busca = validarBuscaAtivos(Route.useSearch());

  return (
    <div className="space-y-4">
      {(busca.subcategoria || busca.alerta) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtrado por:</span>
          {busca.subcategoria && (
            <Badge variant="secondary" className="gap-1">
              Subcategoria: {busca.subcategoria}
              <Link
                to="/ativos"
                search={({ subcategoria: _s, ...resto }) => resto}
                aria-label="Remover filtro de subcategoria"
              >
                <X className="size-3" />
              </Link>
            </Badge>
          )}
          {busca.alerta && (
            <Badge variant="secondary" className="gap-1">
              Alerta: {ALERTA_POR_SLUG[busca.alerta]}
              <Link
                to="/ativos"
                search={({ alerta: _a, ...resto }) => resto}
                aria-label="Remover filtro de alerta"
              >
                <X className="size-3" />
              </Link>
            </Badge>
          )}
        </div>
      )}
      <PaginaAnaliseVazia
        titulo="Ativos"
        descricao="Detalhamento por patrimônio: custos, horas e histórico."
        icone={Tractor}
      />
    </div>
  );
}
