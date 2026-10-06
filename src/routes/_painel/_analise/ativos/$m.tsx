import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Tractor } from "lucide-react";
import { useMemo } from "react";

import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { Button } from "@/components/ui/button";
import { useMensalAtivo } from "@/lib/dados";
import { validarFiltrosSearch } from "@/lib/filtros";

export const Route = createFileRoute("/_painel/_analise/ativos/$m")({
  head: ({ params }) => ({ meta: [{ title: `M${params.m} · Painel de Mecanizado` }] }),
  component: FichaAtivo,
});

function FichaAtivo() {
  const { m } = Route.useParams();
  const { data } = useMensalAtivo();
  const ativo = useMemo(() => {
    const linhas = (data ?? []).filter((l) => String(l.m) === m);
    return linhas.reduce<(typeof linhas)[number] | null>(
      (a, b) => (a == null || b.mes > a.mes ? b : a),
      null,
    );
  }, [data, m]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/ativos" search={(prev) => validarFiltrosSearch(prev)}>
          <ArrowLeft className="size-4" />
          Ativos
        </Link>
      </Button>
      <CabecalhoPagina
        titulo={`M${m}${ativo?.patrimonio ? ` · ${ativo.patrimonio}` : ""}`}
        descricao={
          ativo
            ? `${ativo.subgrupo ?? "Sem subgrupo"} · ${ativo.subcategoria}`
            : "Ficha do ativo: custos, consumo e histórico."
        }
        icone={Tractor}
      />
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed bg-card p-8 text-sm text-muted-foreground">
        Ficha do ativo em construção.
      </div>
    </div>
  );
}
