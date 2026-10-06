import { useNavigate } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { LinkDestino, RegraCalculo, Variacao } from "@/components/painel/cartao-kpi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { validarFiltrosSearch } from "@/lib/filtros";
import { formatMoeda, formatMoedaCompacta, formatPercentual } from "@/lib/format";
import type { LinhaComposicao } from "@/lib/metricas";

/** Componentes do custo, na ordem fixa da paleta (ver --serie-* em styles.css). */
export const COMPONENTES = [
  { chave: "combustivel", rotulo: "Combustível", cor: "var(--serie-1)" },
  { chave: "manutencao", rotulo: "Manutenção", cor: "var(--serie-2)" },
  { chave: "salario", rotulo: "Salário", cor: "var(--serie-3)" },
  { chave: "depreciacao", rotulo: "Depreciação", cor: "var(--serie-4)" },
] as const;

function DicaGrafico({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: LinhaComposicao }[];
}) {
  const linha = payload?.[0]?.payload;
  if (!active || !linha) return null;
  return (
    <div className="min-w-48 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <div className="mb-2 font-semibold">{linha.subcategoria}</div>
      <div className="space-y-1">
        {COMPONENTES.map((c) => (
          <div key={c.chave} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: c.cor }} />
            <span className="text-muted-foreground">{c.rotulo}</span>
            <span className="ml-auto tabular-nums">{formatMoeda(linha[c.chave])}</span>
          </div>
        ))}
        <div className="flex gap-2 border-t pt-1 font-medium">
          Total <span className="ml-auto tabular-nums">{formatMoeda(linha.total)}</span>
        </div>
      </div>
      <div className="mt-2 text-muted-foreground">Clique para ver os ativos</div>
    </div>
  );
}

export function ComposicaoSubcategoria({ linhas }: { linhas: LinhaComposicao[] }) {
  const navigate = useNavigate();
  const abrirAtivos = (subcategoria: string) =>
    void navigate({
      to: "/ativos",
      search: (prev: Record<string, unknown>) => ({ ...validarFiltrosSearch(prev), subcategoria }),
    });

  return (
    <Card className="min-w-0 gap-4">
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="text-base">Composição por subcategoria</CardTitle>
        <RegraCalculo regra="Custo do período por subcategoria do subgrupo, dividido em combustível, manutenção, salário e depreciação. Clique numa barra para ver os ativos." />
      </CardHeader>
      <CardContent className="space-y-4">
        <ul
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
          aria-label="Legenda"
        >
          {COMPONENTES.map((c) => (
            <li key={c.chave} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: c.cor }} />
              {c.rotulo}
            </li>
          ))}
        </ul>
        <div
          className="h-[230px]"
          role="img"
          aria-label="Barras empilhadas do custo por subcategoria; valores na tabela abaixo"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={linhas}
              layout="vertical"
              margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
              barCategoryGap={10}
            >
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatMoedaCompacta(v)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="subcategoria"
                width={128}
                tick={{ fontSize: 12, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<DicaGrafico />} cursor={{ fill: "var(--muted)" }} />
              {COMPONENTES.map((c, i) => (
                <Bar
                  key={c.chave}
                  dataKey={c.chave}
                  name={c.rotulo}
                  stackId="custo"
                  fill={c.cor}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                  radius={i === COMPONENTES.length - 1 ? [0, 4, 4, 0] : 0}
                  className="cursor-pointer"
                  onClick={(d: { payload?: LinhaComposicao }) =>
                    d.payload && abrirAtivos(d.payload.subcategoria)
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="-mx-2 overflow-x-auto">
          <Table className="text-xs [&_td]:whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Subcategoria</TableHead>
                <TableHead className="text-right">Período</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">12m</TableHead>
                <TableHead className="text-right">Var. 12m</TableHead>
                <TableHead className="text-right">Ano ant.</TableHead>
                <TableHead className="text-right">Var. a.a.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow key={l.subcategoria}>
                  <TableCell className="font-medium">
                    <LinkDestino
                      destino={{ to: "/ativos", busca: { subcategoria: l.subcategoria } }}
                      className="hover:underline"
                    >
                      {l.subcategoria}
                    </LinkDestino>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoeda(l.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.pct == null ? "—" : formatPercentual(l.pct)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoeda(l.total12m)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Variacao valor={l.var12m} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoeda(l.totalAnoAnterior)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Variacao valor={l.varAnoAnterior} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
