import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  CloudOff,
  Fuel,
  Gauge,
  LayoutDashboard,
  RefreshCw,
  Tags,
  TriangleAlert,
} from "lucide-react";
import { useMemo } from "react";

import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { CartaoKpi, LinkDestino, RegraCalculo, Variacao } from "@/components/painel/cartao-kpi";
import { COMPONENTES, ComposicaoSubcategoria } from "@/components/visao-geral/composicao";
import { TopAtivos } from "@/components/visao-geral/top-ativos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SLUG_POR_ALERTA } from "@/lib/busca-ativos";
import { useMensalAtivo, useParametrosTipados } from "@/lib/dados";
import {
  formatDecimal,
  formatMes,
  formatMoeda,
  formatMoedaCentavos,
  formatMoedaCompacta,
  formatNumero,
  formatPercentual,
} from "@/lib/format";
import {
  ALERTAS,
  composicaoPorSubcategoria,
  conferirTotais,
  custoNaoClassificado,
  eficienciaCategoria,
  filtroDaUrl,
  resumirAlertas,
  resumoPeriodo,
  tabelaAtivos,
  variacao,
  type Alerta,
  type LinhaMensalAtivo,
  type Parametros,
} from "@/lib/metricas";
import { useFiltros } from "@/lib/use-filtros";

export const Route = createFileRoute("/_painel/_analise/visao-geral")({
  head: () => ({ meta: [{ title: "Visão geral · Painel de Mecanizado" }] }),
  component: VisaoGeral,
});

const DESCRICAO = "Resumo do custo da frota, máquinas e implementos no período.";

function VisaoGeral() {
  const consulta = useMensalAtivo();

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Visão geral" descricao={DESCRICAO} icone={LayoutDashboard} />
      {supabase == null ? (
        <Aviso
          icone={CloudOff}
          titulo="Sem banco conectado"
          texto="Modo de pré-visualização: habilite o Lovable Cloud para ver os dados."
        />
      ) : consulta.isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar os dados</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {consulta.error instanceof Error ? consulta.error.message : "Erro desconhecido."}
            <Button size="sm" variant="outline" onClick={() => void consulta.refetch()}>
              <RefreshCw className="size-3.5" /> Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : consulta.isPending ? (
        <Carregando />
      ) : consulta.data.length === 0 ? (
        <BaseVazia />
      ) : (
        <Painel linhas={consulta.data} />
      )}
    </div>
  );
}

function Painel({ linhas }: { linhas: LinhaMensalAtivo[] }) {
  const { filtros } = useFiltros();
  const parametros = useParametrosTipados();
  const f = useMemo(() => filtroDaUrl(filtros), [filtros]);
  const m = useMemo(() => calcular(linhas, f, parametros), [linhas, f, parametros]);
  const { resumo, atual } = m;

  return (
    <>
      <p className="-mt-3 text-xs text-muted-foreground">
        {formatMes(f.mesIni)} a {formatMes(f.mesFim)} · comparado a{" "}
        {formatMes(resumo.periodos.anterior.ini)}–{formatMes(resumo.periodos.anterior.fim)} (período
        anterior) e {formatMes(resumo.periodos.anoAnterior.ini)}–
        {formatMes(resumo.periodos.anoAnterior.fim)} (ano anterior)
      </p>

      {/* Linha 1 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoKpi
          tamanho="g"
          titulo="Custo total do período"
          icone={CircleDollarSign}
          valor={formatMoedaCompacta(atual.custo_total)}
          valorCompleto={formatMoeda(atual.custo_total)}
          regra="Soma do custo total (valor total dos lançamentos) no período e filtros selecionados."
          destino={{ to: "/tendencia" }}
        >
          <Variacao
            valor={variacao(atual.custo_total, resumo.anterior.custo_total)}
            rotulo="x período anterior"
          />
          <Variacao
            valor={variacao(atual.custo_total, resumo.anoAnterior.custo_total)}
            rotulo="x mesmo período ano anterior"
          />
        </CartaoKpi>
        <CartaoKpi
          tamanho="g"
          titulo="Custo 12 meses"
          icone={CircleDollarSign}
          valor={formatMoedaCompacta(resumo.ultimos12m.custo_total)}
          valorCompleto={formatMoeda(resumo.ultimos12m.custo_total)}
          regra={`Soma dos 12 meses terminando em ${formatMes(f.mesFim)}, comparada aos 12 meses anteriores.`}
          destino={{ to: "/tendencia" }}
        >
          <Variacao
            valor={variacao(resumo.ultimos12m.custo_total, resumo.anteriores12m.custo_total)}
            rotulo="x 12m anteriores"
          />
        </CartaoKpi>
        <CartaoKpi
          tamanho="g"
          titulo="Litros no período"
          icone={Fuel}
          valor={`${formatNumero(atual.litros)} L`}
          regra="Litros abastecidos no período. R$/litro = custo de combustível ÷ litros."
          destino={{ to: "/eficiencia" }}
        >
          <span className="text-xs text-muted-foreground">
            {atual.reaisPorLitro == null
              ? "Sem litros no período"
              : `${formatMoedaCentavos(atual.reaisPorLitro)} por litro`}
          </span>
        </CartaoKpi>
        <CartaoKpi
          tamanho="g"
          titulo="Alertas no período"
          icone={TriangleAlert}
          valor={formatNumero(m.alertas.total)}
          regra="Quantidade de alertas dos ativos no período: sem uso c/ custo, abasteceu sem km/h, consumo fora do padrão e manutenção atípica."
          destino={{ to: "/ativos" }}
        >
          <span className="text-xs text-muted-foreground">
            em {formatNumero(m.alertas.ativosComAlerta)}{" "}
            {m.alertas.ativosComAlerta === 1 ? "ativo" : "ativos"}
          </span>
        </CartaoKpi>
      </section>

      {/* Linha 2 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {COMPONENTES.map((c) => (
          <CartaoKpi
            key={c.chave}
            titulo={c.rotulo}
            marcador={c.cor}
            valor={formatMoedaCompacta(atual[c.chave])}
            valorCompleto={formatMoeda(atual[c.chave])}
            regra={REGRAS_COMPONENTE[c.chave]}
            destino={{ to: DESTINO_COMPONENTE[c.chave] }}
          >
            <span className="text-xs text-muted-foreground">
              {atual.pct[c.chave] == null ? "—" : formatPercentual(atual.pct[c.chave]!)} do total
            </span>
          </CartaoKpi>
        ))}
      </section>

      {/* Linha 3 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoEficiencia
          titulo="Veículos km/L"
          regra="Km rodados ÷ litros dos veículos (subgrupos medidos em km). Maior é melhor."
          valor={m.veiculos.periodo.consumo}
          valor12m={m.veiculos.ultimos12m.consumo}
          formatar={(v) => `${formatDecimal(v, 2)} km/L`}
        />
        <CartaoEficiencia
          titulo="Veículos R$/km"
          regra="Custo total ÷ km rodados dos veículos (subgrupos medidos em km)."
          valor={m.veiculos.periodo.custoPorUnidade}
          valor12m={m.veiculos.ultimos12m.custoPorUnidade}
          formatar={(v) => `${formatMoedaCentavos(v)}/km`}
        />
        <CartaoEficiencia
          titulo="Máquinas L/h"
          regra="Litros ÷ horas trabalhadas das máquinas (subgrupos medidos em horas). Menor é melhor."
          valor={m.maquinas.periodo.consumo}
          valor12m={m.maquinas.ultimos12m.consumo}
          formatar={(v) => `${formatDecimal(v, 1)} L/h`}
        />
        <CartaoEficiencia
          titulo="Máquinas R$/h"
          regra="Custo total ÷ horas trabalhadas das máquinas (subgrupos medidos em horas)."
          valor={m.maquinas.periodo.custoPorUnidade}
          valor12m={m.maquinas.ultimos12m.custoPorUnidade}
          formatar={(v) => `${formatMoedaCentavos(v)}/h`}
        />
      </section>

      {/* Composição + Top 10 */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ComposicaoSubcategoria linhas={m.composicao} />
        <TopAtivos ativos={m.top10} />
      </section>

      {/* Alertas por tipo */}
      <section
        aria-label="Alertas por tipo"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      >
        {ORDEM_ALERTAS.map((a) => (
          <CartaoAlerta
            key={a.alerta}
            titulo={a.titulo}
            regra={a.regra(parametros)}
            valor={formatNumero(m.alertas.porTipo[a.alerta])}
            unidade={m.alertas.porTipo[a.alerta] === 1 ? "ativo" : "ativos"}
            ativo={m.alertas.porTipo[a.alerta] > 0}
            destino={{ to: "/ativos", busca: { alerta: SLUG_POR_ALERTA[a.alerta] } }}
          />
        ))}
        <CartaoAlerta
          titulo="Custo não classificado"
          regra="Custo do período em subgrupos sem categoria na tabela de classificação."
          valor={formatMoedaCompacta(m.naoClassificado)}
          ativo={m.naoClassificado > 0}
          destino={{ to: "/ativos", busca: { subcategoria: "NÃO CLASSIFICADO" } }}
          icone={Tags}
        />
      </section>

      <Conferencia conferencia={m.conferencia} somaSubcategorias={m.somaSubcategorias} />
    </>
  );
}

function calcular(
  linhas: LinhaMensalAtivo[],
  f: ReturnType<typeof filtroDaUrl>,
  parametros: Parametros,
) {
  const resumo = resumoPeriodo(linhas, f);
  const tabela = tabelaAtivos(linhas, f, parametros);
  const composicao = composicaoPorSubcategoria(linhas, f);
  return {
    resumo,
    atual: resumo.atual,
    alertas: resumirAlertas(tabela),
    top10: tabela.slice(0, 10),
    composicao,
    somaSubcategorias: composicao.reduce((s, c) => s + c.total, 0),
    veiculos: eficienciaCategoria(linhas, f, "VEÍCULOS", "km"),
    maquinas: eficienciaCategoria(linhas, f, "MÁQUINAS", "h"),
    naoClassificado: custoNaoClassificado(linhas, f),
    conferencia: conferirTotais(resumo.atual),
  };
}

const REGRAS_COMPONENTE = {
  combustivel: "Custo de combustível no período e % do custo total.",
  manutencao:
    "Custo total menos salário, combustível e depreciação, sem os lançamentos de pessoal; % do custo total.",
  salario: "Salários mais pessoal/encargos lançados em manutenção; % do custo total.",
  depreciacao: "Depreciação no período e % do custo total.",
} as const;

const DESTINO_COMPONENTE = {
  combustivel: "/eficiencia",
  manutencao: "/manutencao",
  salario: "/ativos",
  depreciacao: "/ativos",
} as const;

const ORDEM_ALERTAS: { alerta: Alerta; titulo: string; regra: (p: Parametros) => string }[] = [
  {
    alerta: ALERTAS.SEM_USO_COM_CUSTO,
    titulo: "Sem uso c/ custo",
    regra: () => "Ativo medido em km ou horas com custo no período, mas sem km/horas e sem litros.",
  },
  {
    alerta: ALERTAS.ABASTECEU_SEM_KM_H,
    titulo: "Abasteceu sem km/h",
    regra: () => "Ativo com litros abastecidos no período e km/horas zerados.",
  },
  {
    alerta: ALERTAS.CONSUMO_FORA_PADRAO,
    titulo: "Consumo fora do padrão",
    regra: (p) =>
      `Com pelo menos ${formatNumero(p.alerta_consumo_min_litros)} L, consumo ${formatPercentual(p.alerta_consumo_desvio)} pior que a média 12m do subgrupo (km/L abaixo ou L/h acima).`,
  },
  {
    alerta: ALERTAS.MANUTENCAO_ATIPICA,
    titulo: "Manutenção atípica",
    regra: (p) =>
      `Manutenção no período acima de ${formatMoeda(p.alerta_manut_min)} e média mensal maior que ${formatNumero(p.alerta_manut_multiplo)}x a média mensal dos últimos 12 meses.`,
  },
];

function CartaoEficiencia({
  titulo,
  regra,
  valor,
  valor12m,
  formatar,
}: {
  titulo: string;
  regra: string;
  valor: number | null;
  valor12m: number | null;
  formatar: (v: number) => string;
}) {
  return (
    <CartaoKpi
      tamanho="p"
      titulo={titulo}
      icone={Gauge}
      valor={valor == null ? "—" : formatar(valor)}
      regra={regra}
      destino={{ to: "/eficiencia" }}
    >
      <span className="text-xs text-muted-foreground tabular-nums">
        12m: {valor12m == null ? "—" : formatar(valor12m)}
      </span>
    </CartaoKpi>
  );
}

function CartaoAlerta({
  titulo,
  regra,
  valor,
  unidade,
  ativo,
  destino,
  icone: Icone = TriangleAlert,
}: {
  titulo: string;
  regra: string;
  valor: string;
  unidade?: string;
  ativo: boolean;
  destino: { to: string; busca?: Record<string, string> };
  icone?: typeof TriangleAlert;
}) {
  return (
    <div
      className={`relative flex flex-col gap-1 rounded-xl border p-3 transition-colors hover:border-primary/40 ${
        ativo
          ? "border-amber-300/70 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30"
          : "bg-card"
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Icone
          className={`size-3.5 shrink-0 ${ativo ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
          aria-hidden
        />
        <LinkDestino
          destino={destino}
          className="truncate outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-ring"
        >
          {titulo}
        </LinkDestino>
        <span className="ml-auto">
          <RegraCalculo regra={regra} />
        </span>
      </div>
      <div className="text-lg font-semibold tabular-nums">
        {valor}
        {unidade && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">{unidade}</span>
        )}
      </div>
    </div>
  );
}

function Conferencia({
  conferencia,
  somaSubcategorias,
}: {
  conferencia: ReturnType<typeof conferirTotais>;
  somaSubcategorias: number;
}) {
  const difSub = somaSubcategorias - conferencia.totalBase;
  const ok = conferencia.ok && Math.abs(difSub) <= 1;
  if (ok) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-success" aria-hidden />
        Conferência: soma das categorias = total da base ({formatMoeda(conferencia.totalBase)})
      </p>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div>
        <strong>Conferência:</strong> a soma das categorias não fecha com o total da base (
        {formatMoeda(conferencia.totalBase)}).
        {!conferencia.ok && (
          <>
            {" "}
            Combustível + manutenção + salário + depreciação ={" "}
            {formatMoeda(conferencia.somaCategorias)} (diferença de{" "}
            {formatMoeda(conferencia.diferenca)}).
          </>
        )}
        {Math.abs(difSub) > 1 && (
          <>
            {" "}
            Soma das subcategorias = {formatMoeda(somaSubcategorias)} (diferença de{" "}
            {formatMoeda(difSub)}).
          </>
        )}
      </div>
    </div>
  );
}

function Carregando() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando dados">
      {[4, 4, 4].map((n, i) => (
        <div key={i} className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: n }, (_, j) => (
            <Skeleton key={j} className={i === 0 ? "h-32" : i === 1 ? "h-24" : "h-20"} />
          ))}
        </div>
      ))}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

function BaseVazia() {
  const { isAdmin } = useAuth();
  return (
    <Aviso
      icone={CloudOff}
      titulo="Nenhum lançamento na base"
      texto={
        isAdmin
          ? "Importe a planilha de custos em Administração › Importar para preencher o painel."
          : "Os dados ainda não foram importados. Fale com o administrador."
      }
    />
  );
}

function Aviso({
  icone: Icone,
  titulo,
  texto,
}: {
  icone: typeof CloudOff;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card p-8 text-center">
      <Icone className="size-8 text-muted-foreground/60" />
      <p className="font-medium">{titulo}</p>
      <p className="max-w-md text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
