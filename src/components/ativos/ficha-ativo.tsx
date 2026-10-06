import { Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EtiquetaAlerta } from "@/components/ativos/etiqueta-alerta";
import { EstadoConsultas } from "@/components/painel/estado-consultas";
import { COMPONENTES } from "@/components/visao-geral/composicao";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAtivosCadastro,
  useLancamentosAtivo,
  useMensalAtivo,
  useParametrosTipados,
  useSemirreboques,
} from "@/lib/dados";
import {
  formatDecimal,
  formatMes,
  formatMoeda,
  formatMoedaCompacta,
  formatVariacao,
  somarMeses,
} from "@/lib/format";
import {
  filtroDaUrl,
  motoristaMaisFrequente,
  serieMensal,
  tabelaAtivosCompleta,
  type AtivoCadastro,
  type LinhaMensalAtivo,
  type Unidade,
} from "@/lib/metricas";
import { useAtivoAberto } from "@/lib/use-ativo-aberto";
import { useFiltros } from "@/lib/use-filtros";
import { cn } from "@/lib/utils";

/** Painel lateral com a ficha do ativo aberto em ?ativo=M. */
export function FichaAtivo() {
  const { m, fechar } = useAtivoAberto();
  return (
    <Sheet open={m != null} onOpenChange={(aberto) => !aberto && fechar()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        {m != null && <ConteudoFicha m={m} />}
      </SheetContent>
    </Sheet>
  );
}

function ConteudoFicha({ m }: { m: number }) {
  const mensal = useMensalAtivo();
  const cadastro = useAtivosCadastro();
  const semirreboques = useSemirreboques();

  return (
    <EstadoConsultas
      consultas={[mensal, cadastro, semirreboques]}
      esqueleto={
        <div className="space-y-4 p-6">
          <Skeleton className="h-16" />
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      }
    >
      {() => (
        <Ficha
          m={m}
          linhas={mensal.data!}
          cadastro={cadastro.data!}
          semirreboques={semirreboques.data!}
        />
      )}
    </EstadoConsultas>
  );
}

const SUFIXO_CONSUMO: Record<Unidade, string> = { km: "km/L", h: "L/h", "-": "" };

function Ficha({
  m,
  linhas,
  cadastro,
  semirreboques,
}: {
  m: number;
  linhas: LinhaMensalAtivo[];
  cadastro: AtivoCadastro[];
  semirreboques: number[];
}) {
  const { filtros } = useFiltros();
  const parametros = useParametrosTipados();
  // a ficha mostra o ativo independente dos filtros de grupo/patrimônio da barra
  const f = useMemo(() => ({ ...filtroDaUrl(filtros), grupo: null, m }), [filtros, m]);
  const ativo = useMemo(
    () => tabelaAtivosCompleta(linhas, cadastro, f, parametros, semirreboques)[0] ?? null,
    [linhas, cadastro, f, parametros, semirreboques],
  );
  // gráfico: o período, ou os 12 meses até o mês final se o período for menor
  const iniGrafico = f.mesIni < somarMeses(f.mesFim, -11) ? f.mesIni : somarMeses(f.mesFim, -11);
  const serie = useMemo(
    () => serieMensal(linhas, { ...f, mesIni: iniGrafico }),
    [linhas, f, iniGrafico],
  );
  const lancamentos = useLancamentosAtivo(m, { ini: f.mesIni, fim: f.mesFim }, f.empresa);
  const motorista = useMemo(
    () => motoristaMaisFrequente(lancamentos.data ?? []),
    [lancamentos.data],
  );
  const doCadastro = cadastro.find((c) => c.m === m);

  if (!ativo) {
    return (
      <SheetHeader className="p-6">
        <SheetTitle>M{m}</SheetTitle>
        <SheetDescription>
          Ativo não encontrado no cadastro nem nos lançamentos com os filtros atuais.
        </SheetDescription>
      </SheetHeader>
    );
  }

  const unidade = ativo.unidade;
  const sufixo = SUFIXO_CONSUMO[unidade];

  return (
    <>
      <SheetHeader className="border-b p-6 pr-12">
        <SheetDescription className="text-xs">
          Ficha do ativo · {formatMes(f.mesIni)} a {formatMes(f.mesFim)}
          {f.empresa !== "TODAS" && ` · ${f.empresa}`}
        </SheetDescription>
        <SheetTitle className="text-xl">
          M{ativo.m}
          {ativo.patrimonio && <span className="font-normal"> · {ativo.patrimonio}</span>}
        </SheetTitle>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <Campo rotulo="Subgrupo" valor={ativo.subgrupo ?? doCadastro?.subgrupo} />
          <Campo rotulo="Grupo" valor={ativo.grupo} />
          <Campo
            rotulo="Unidade"
            valor={unidade === "km" ? "km" : unidade === "h" ? "horas" : "sem medição"}
          />
          <Campo rotulo="Subcategoria" valor={ativo.subcategoria} />
          <Campo
            rotulo="Motorista mais frequente"
            valor={lancamentos.isPending ? "…" : (motorista ?? "—")}
          />
          {ativo.empresas.length > 0 && (
            <Campo rotulo="Empresa" valor={ativo.empresas.join(", ")} />
          )}
        </dl>
      </SheetHeader>

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini
            rotulo="Custo no período"
            valor={formatMoedaCompacta(ativo.custo_total)}
            titulo={formatMoeda(ativo.custo_total)}
          />
          <Mini
            rotulo="Custo 12m"
            valor={formatMoedaCompacta(ativo.custo12m)}
            titulo={formatMoeda(ativo.custo12m)}
          />
          <Mini
            rotulo="Consumo x referência"
            valor={
              ativo.consumo == null
                ? "—"
                : `${formatDecimal(ativo.consumo, unidade === "km" ? 2 : 1)} ${sufixo}`
            }
          >
            {ativo.consumoRef12m != null && (
              <span className="text-xs text-muted-foreground">
                ref. subgrupo {formatDecimal(ativo.consumoRef12m, unidade === "km" ? 2 : 1)}{" "}
                {sufixo}
                {ativo.desvioConsumo != null && (
                  <span
                    className={cn(
                      "ml-1 font-medium",
                      (unidade === "km" ? ativo.desvioConsumo < 0 : ativo.desvioConsumo > 0)
                        ? "text-destructive"
                        : "text-success",
                    )}
                  >
                    ({formatVariacao(ativo.desvioConsumo)})
                  </span>
                )}
              </span>
            )}
          </Mini>
          <Mini rotulo="Alertas" valor={String(ativo.alertas.length)}>
            <div className="flex flex-wrap gap-1">
              {ativo.alertas.map((a) => (
                <EtiquetaAlerta
                  key={a}
                  alerta={a}
                  className="whitespace-normal py-1 leading-tight"
                />
              ))}
            </div>
          </Mini>
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold">
            Custo mensal · {formatMes(iniGrafico)} a {formatMes(f.mesFim)}
          </h3>
          <ul
            className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
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
            className="h-56"
            role="img"
            aria-label="Custo mensal do ativo empilhado por componente"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="mes"
                  tickFormatter={formatMes}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v: number) => formatMoedaCompacta(v)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  formatter={(v: number, nome: string) => [formatMoeda(v), nome]}
                  labelFormatter={(mes: string) => formatMes(mes)}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {COMPONENTES.map((c, i) => (
                  <Bar
                    key={c.chave}
                    dataKey={c.chave}
                    name={c.rotulo}
                    stackId="custo"
                    fill={c.cor}
                    stroke="var(--background)"
                    strokeWidth={1}
                    isAnimationActive={false}
                    radius={i === COMPONENTES.length - 1 ? [4, 4, 0, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <ListaLancamentos consulta={lancamentos} />
      </div>
    </>
  );
}

function ListaLancamentos({ consulta }: { consulta: ReturnType<typeof useLancamentosAtivo> }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const filtrados = useMemo(() => {
    const todos = [...(consulta.data ?? [])].sort(
      (a, b) => b.mes.localeCompare(a.mes) || b.id - a.id,
    );
    if (!termo) return todos;
    return todos.filter((l) =>
      [l.produto, l.despesa, l.classe, l.conta, l.motorista, formatMes(l.mes)].some((v) =>
        v?.toLowerCase().includes(termo),
      ),
    );
  }, [consulta.data, termo]);
  const total = filtrados.reduce((s, l) => s + l.valor, 0);

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Lançamentos do período</h3>
        <span className="text-xs text-muted-foreground">
          {filtrados.length} {filtrados.length === 1 ? "lançamento" : "lançamentos"} ·{" "}
          {formatMoeda(total)}
        </span>
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto, despesa, conta…"
            aria-label="Buscar nos lançamentos"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      <EstadoConsultas consultas={[consulta]} esqueleto={<Skeleton className="h-40" />}>
        {() =>
          filtrados.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              {termo ? "Nenhum lançamento encontrado." : "Sem lançamentos no período."}
            </p>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Mês</th>
                    <th className="px-3 py-2 font-medium">Produto / despesa</th>
                    <th className="px-3 py-2 font-medium">Classe</th>
                    <th className="px-3 py-2 font-medium">Conta</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((l) => (
                    <tr key={l.id} className="border-t align-top">
                      <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">
                        {formatMes(l.mes)}
                      </td>
                      <td className="px-3 py-1.5">
                        <div>{l.produto ?? l.despesa ?? "—"}</div>
                        {l.produto && l.despesa && (
                          <div className="text-muted-foreground">{l.despesa}</div>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{l.classe ?? "—"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{l.conta ?? "—"}</td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-3 py-1.5 text-right tabular-nums",
                          l.valor < 0 && "text-success",
                        )}
                      >
                        {formatMoeda(l.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </EstadoConsultas>
    </section>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="truncate font-medium">{valor || "—"}</dd>
    </div>
  );
}

function Mini({
  rotulo,
  valor,
  titulo,
  children,
}: {
  rotulo: string;
  valor: string;
  titulo?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3">
      <span className="text-xs text-muted-foreground">{rotulo}</span>
      <span className="text-lg font-semibold tabular-nums" title={titulo}>
        {valor}
      </span>
      {children}
    </div>
  );
}
