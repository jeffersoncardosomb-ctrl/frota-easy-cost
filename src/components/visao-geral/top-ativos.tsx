import { Link } from "@tanstack/react-router";

import { RegraCalculo } from "@/components/painel/cartao-kpi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoeda, formatMoedaCompacta } from "@/lib/format";
import type { LinhaTabelaAtivo } from "@/lib/metricas";

export function TopAtivos({ ativos }: { ativos: LinhaTabelaAtivo[] }) {
  const maior = Math.max(...ativos.map((a) => a.custo_total), 0);
  return (
    <Card className="min-w-0 gap-4">
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="text-base">Top 10 ativos no período</CardTitle>
        <RegraCalculo regra="Os 10 ativos (M) com maior custo total no período e filtros selecionados. Clique para abrir a ficha do ativo." />
      </CardHeader>
      <CardContent>
        {ativos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem custos no período.</p>
        ) : (
          <ol className="space-y-1">
            {ativos.map((a, i) => (
              <li key={a.m}>
                <Link
                  to="."
                  search={(prev: Record<string, unknown>) => ({ ...prev, ativo: a.m })}
                  className="block rounded-lg px-2 py-2 transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <span className="font-semibold tabular-nums">M{a.m}</span>
                    <span className="min-w-0 truncate">{a.patrimonio ?? "—"}</span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                      {a.subgrupo}
                    </span>
                    <span
                      className="ml-auto shrink-0 font-medium tabular-nums"
                      title={formatMoeda(a.custo_total)}
                    >
                      {formatMoedaCompacta(a.custo_total)}
                    </span>
                  </div>
                  <div className="mt-1.5 ml-7 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${maior > 0 ? Math.max((a.custo_total / maior) * 100, 1) : 0}%`,
                      }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
