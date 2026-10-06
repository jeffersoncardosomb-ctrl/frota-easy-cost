import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CloudOff, Wrench } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  type LabelProps,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { RegraCalculo, Variacao } from "@/components/painel/cartao-kpi";
import { AvisoVazio, EstadoConsultas } from "@/components/painel/estado-consultas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useManutClasse, useMensalAtivo } from "@/lib/dados";
import { formatMes, formatMoeda, formatMoedaCompacta, formatPercentual } from "@/lib/format";
import {
  CLASSE_A_CLASSIFICAR,
  filtroDaUrl,
  manutencaoPorClasse,
  resumoPeriodo,
  SUBCATEGORIAS_MANUTENCAO,
  type LinhaClasseManutencao,
  type LinhaManutClasse,
  type LinhaMensalAtivo,
  type ValoresClasse,
} from "@/lib/metricas";
import { useFiltros } from "@/lib/use-filtros";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_painel/_analise/manutencao")({
  head: () => ({ meta: [{ title: "Manutenção · Painel de Mecanizado" }] }),
  component: Manutencao,
});

function Manutencao() {
  const manut = useManutClasse();
  const mensal = useMensalAtivo();
  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Manutenção"
        descricao="Gastos de manutenção por classe: peças, oficina, serviços, pneus e demais."
        icone={Wrench}
      />
      <EstadoConsultas
        consultas={[manut, mensal]}
        esqueleto={
          <div className="space-y-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-96" />
          </div>
        }
      >
        {() =>
          manut.data!.length === 0 ? (
            <AvisoVazio
              icone={CloudOff}
              titulo="Nenhum lançamento de manutenção na base"
              texto="Os dados aparecem aqui depois da importação da planilha."
            />
          ) : (
            <Painel manut={manut.data!} mensal={mensal.data!} />
          )
        }
      </EstadoConsultas>
    </div>
  );
}

function Painel({ manut, mensal }: { manut: LinhaManutClasse[]; mensal: LinhaMensalAtivo[] }) {
  const { filtros } = useFiltros();
  const f = useMemo(() => filtroDaUrl(filtros), [filtros]);
  const dados = useMemo(() => manutencaoPorClasse(manut, f), [manut, f]);
  const depreciacao = useMemo(() => {
    const r = resumoPeriodo(mensal, f);
    return { periodo: r.atual.depreciacao, total12m: r.ultimos12m.depreciacao };
  }, [mensal, f]);

  return (
    <>
      {dados.aClassificarPeriodo !== 0 && <AvisoAClassificar valor={dados.aClassificarPeriodo} />}
      <GraficoClasses
        classes={dados.classes}
        periodo={`${formatMes(f.mesIni)} a ${formatMes(f.mesFim)}`}
      />
      <TabelaClasses dados={dados} depreciacao={depreciacao} mesFim={f.mesFim} />
    </>
  );
}

function AvisoAClassificar({ valor }: { valor: number }) {
  const { isAdmin } = useAuth();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <span>
        <strong>{formatMoeda(valor)}</strong> de manutenção no período ainda estão em{" "}
        <strong>A CLASSIFICAR</strong>: a despesa não tem classe no mapa de manutenção.
      </span>
      {isAdmin ? (
        <Button asChild size="sm" variant="outline" className="ml-auto bg-background">
          <Link to="/admin/cadastros" search={{ aba: "mapa-manutencao" }}>
            Classificar itens
          </Link>
        </Button>
      ) : (
        <span className="ml-auto text-xs">Peça ao administrador para classificar.</span>
      )}
    </div>
  );
}

function GraficoClasses({
  classes,
  periodo,
}: {
  classes: LinhaClasseManutencao[];
  periodo: string;
}) {
  const temNegativo = classes.some((c) => c.periodo < 0);
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="text-base">Manutenção por classe · {periodo}</CardTitle>
        <RegraCalculo regra="Soma da manutenção do período por classe do mapa de manutenção. Pessoal lançado em manutenção não entra (vai para Salário). Estornos podem ser negativos." />
      </CardHeader>
      <CardContent>
        <div
          className="h-[360px]"
          role="img"
          aria-label="Barras horizontais da manutenção por classe; valores na tabela abaixo"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={classes}
              layout="vertical"
              margin={{ top: 0, right: 72, bottom: 0, left: 0 }}
              barCategoryGap={6}
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
                dataKey="classe"
                width={215}
                tick={{ fontSize: 12, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              {temNegativo && <ReferenceLine x={0} stroke="var(--muted-foreground)" />}
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                formatter={(v: number) => [formatMoeda(v), "Manutenção"]}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="periodo" name="Manutenção" radius={4} isAnimationActive={false}>
                {classes.map((c) => (
                  <Cell
                    key={c.classe}
                    fill={
                      c.classe === CLASSE_A_CLASSIFICAR
                        ? "var(--muted-foreground)"
                        : "var(--serie-2)"
                    }
                  />
                ))}
                <LabelList dataKey="periodo" content={RotuloValor} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/** Valor ao fim da barra, sem quebra de linha (à esquerda quando negativo). */
function RotuloValor(props: LabelProps) {
  const valor = Number(props.value ?? 0);
  if (!valor) return null;
  const x = Number(props.x ?? 0);
  const w = Number(props.width ?? 0);
  const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
  const negativo = valor < 0;
  // largura negativa quando a barra vai para a esquerda do zero
  const fim = negativo ? Math.min(x, x + w) - 6 : Math.max(x, x + w) + 6;
  return (
    <text
      x={fim}
      y={y}
      dominantBaseline="central"
      textAnchor={negativo ? "end" : "start"}
      fontSize={11}
      fill="var(--foreground)"
    >
      {formatMoedaCompacta(valor)}
    </text>
  );
}

function TabelaClasses({
  dados,
  depreciacao,
  mesFim,
}: {
  dados: ReturnType<typeof manutencaoPorClasse>;
  depreciacao: { periodo: number; total12m: number };
  mesFim: string;
}) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center gap-2">
        <CardTitle className="text-base">Detalhamento por classe</CardTitle>
        <RegraCalculo
          regra={`12m = 12 meses terminando em ${formatMes(mesFim)}; 12m anteriores = os 12 meses antes deles. Colunas por subcategoria mostram o total 12m.`}
        />
      </CardHeader>
      <CardContent>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-xs [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium">Classe</th>
                <th className="px-2 py-2 text-right font-medium">Período</th>
                <th className="px-2 py-2 text-right font-medium">% período</th>
                <th className="px-2 py-2 text-right font-medium">Últimos 12m</th>
                <th className="px-2 py-2 text-right font-medium">% 12m</th>
                <th className="px-2 py-2 text-right font-medium">12m anteriores</th>
                <th className="px-2 py-2 text-right font-medium">Var. 12m</th>
                {SUBCATEGORIAS_MANUTENCAO.map((s) => (
                  <th
                    key={s}
                    className="border-l px-2 py-2 text-right font-medium first-of-type:border-l"
                  >
                    {s} 12m
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.classes.map((c) => (
                <Linha
                  key={c.classe}
                  rotulo={c.classe}
                  v={c}
                  destaque={c.classe === CLASSE_A_CLASSIFICAR && c.periodo !== 0}
                />
              ))}
              <Linha rotulo="Total manutenção" v={dados.total} total />
              <LinhaInformativa
                rotulo="Pessoal lançado em manutenção (movido para Salário)"
                periodo={dados.pessoal.periodo}
                total12m={dados.pessoal.total12m}
              />
              <LinhaInformativa
                rotulo="Depreciação (informativo)"
                periodo={depreciacao.periodo}
                total12m={depreciacao.total12m}
              />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          As duas últimas linhas são informativas e ficam fora do total de manutenção.
        </p>
      </CardContent>
    </Card>
  );
}

function Linha({
  rotulo,
  v,
  total,
  destaque,
}: {
  rotulo: string;
  v: ValoresClasse;
  total?: boolean;
  destaque?: boolean;
}) {
  const pct = (x: number | null) => (x == null ? "—" : formatPercentual(x));
  return (
    <tr
      className={cn(
        "border-b",
        total && "border-t-2 bg-muted/40 font-semibold",
        destaque && "bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      <td className="px-2 py-2 text-left">{rotulo}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatMoeda(v.periodo)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{pct(v.pctPeriodo)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatMoeda(v.total12m)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{pct(v.pct12m)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatMoeda(v.total12mAnterior)}</td>
      <td className="px-2 py-2 text-right">
        <Variacao valor={v.var12m} />
      </td>
      {v.porSubcategoria12m.map((x, i) => (
        <td key={i} className="border-l px-2 py-2 text-right tabular-nums">
          {formatMoeda(x)}
        </td>
      ))}
    </tr>
  );
}

function LinhaInformativa({
  rotulo,
  periodo,
  total12m,
}: {
  rotulo: string;
  periodo: number;
  total12m: number;
}) {
  return (
    <tr className="border-b text-muted-foreground italic">
      <td className="px-2 py-2 text-left">{rotulo}</td>
      <td className="px-2 py-2 text-right tabular-nums">{formatMoeda(periodo)}</td>
      <td className="px-2 py-2" />
      <td className="px-2 py-2 text-right tabular-nums">{formatMoeda(total12m)}</td>
      <td className="px-2 py-2" colSpan={3 + SUBCATEGORIAS_MANUTENCAO.length} />
    </tr>
  );
}
