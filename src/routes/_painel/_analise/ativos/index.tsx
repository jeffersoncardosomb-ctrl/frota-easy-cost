import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CloudOff,
  FileSpreadsheet,
  Loader2,
  Search,
  Tractor,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { COLUNAS, compararValores, type Coluna } from "@/components/ativos/colunas";
import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { AvisoVazio, EstadoConsultas } from "@/components/painel/estado-consultas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ALERTA_POR_SLUG,
  validarBuscaAtivos,
  type BuscaAtivos,
  type SlugAlerta,
} from "@/lib/busca-ativos";
import { exportarExcel } from "@/lib/exportar-excel";
import {
  useAtivosCadastro,
  useMensalAtivo,
  useParametrosTipados,
  useSemirreboques,
} from "@/lib/dados";
import { formatMoeda, formatNumero } from "@/lib/format";
import {
  filtroDaUrl,
  normalizarTexto,
  tabelaAtivosCompleta,
  type AtivoCadastro,
  type LinhaAtivoCompleta,
  type LinhaMensalAtivo,
} from "@/lib/metricas";
import { useAtivoAberto } from "@/lib/use-ativo-aberto";
import { useFiltros } from "@/lib/use-filtros";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_painel/_analise/ativos/")({
  validateSearch: validarBuscaAtivos,
  head: () => ({ meta: [{ title: "Ativos · Painel de Mecanizado" }] }),
  component: Ativos,
});

function Ativos() {
  const mensal = useMensalAtivo();
  const cadastro = useAtivosCadastro();
  const semirreboques = useSemirreboques();
  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Ativos"
        descricao="Custos, consumo, rateio de semirreboques e alertas por patrimônio. Clique numa linha para abrir a ficha."
        icone={Tractor}
      />
      <EstadoConsultas
        consultas={[mensal, cadastro, semirreboques]}
        esqueleto={
          <div className="space-y-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-[480px]" />
          </div>
        }
      >
        {() =>
          mensal.data!.length === 0 && cadastro.data!.length === 0 ? (
            <AvisoVazio
              icone={CloudOff}
              titulo="Nenhum ativo na base"
              texto="Cadastre os ativos ou importe a planilha para preencher esta tela."
            />
          ) : (
            <TabelaAtivos
              linhas={mensal.data!}
              cadastro={cadastro.data!}
              semirreboques={semirreboques.data!}
            />
          )
        }
      </EstadoConsultas>
    </div>
  );
}

const TODOS = "__todos__";

type Ordem = { coluna: string; direcao: "asc" | "desc" };

function TabelaAtivos({
  linhas,
  cadastro,
  semirreboques,
}: {
  linhas: LinhaMensalAtivo[];
  cadastro: AtivoCadastro[];
  semirreboques: number[];
}) {
  const { filtros } = useFiltros();
  const parametros = useParametrosTipados();
  const { abrir } = useAtivoAberto();
  const navigate = Route.useNavigate();
  // o router mescla a query bruta por baixo da validada; validamos de novo
  const busca = validarBuscaAtivos(Route.useSearch());
  const [texto, setTexto] = useState("");
  const [ordem, setOrdem] = useState<Ordem>({ coluna: "custo_total", direcao: "desc" });
  const [exportando, setExportando] = useState(false);

  const f = useMemo(() => filtroDaUrl(filtros), [filtros]);
  const todas = useMemo(
    () => tabelaAtivosCompleta(linhas, cadastro, f, parametros, semirreboques),
    [linhas, cadastro, f, parametros, semirreboques],
  );

  const opcoes = useMemo(() => {
    const unicos = (xs: (string | null)[]) =>
      [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return {
      subcategorias: unicos(todas.map((r) => r.subcategoria)),
      subgrupos: unicos(
        todas
          .filter(
            (r) =>
              !busca.subcategoria ||
              normalizarTexto(r.subcategoria) === normalizarTexto(busca.subcategoria),
          )
          .map((r) => r.subgrupo),
      ),
    };
  }, [todas, busca.subcategoria]);

  const visiveis = useMemo(() => {
    const termo = normalizarTexto(texto);
    const termoM = termo.replace(/^M\s*/, "");
    const alerta = busca.alerta ? ALERTA_POR_SLUG[busca.alerta] : null;
    const coluna = COLUNAS.find((c) => c.id === ordem.coluna) ?? COLUNAS[0]!;
    return todas
      .filter(
        (r) =>
          (!busca.subcategoria ||
            normalizarTexto(r.subcategoria) === normalizarTexto(busca.subcategoria)) &&
          (!busca.subgrupo || normalizarTexto(r.subgrupo) === normalizarTexto(busca.subgrupo)) &&
          (!alerta || r.alertas.includes(alerta)) &&
          (!termo ||
            String(r.m).startsWith(termoM) ||
            normalizarTexto(r.patrimonio).includes(termo) ||
            normalizarTexto(r.subgrupo).includes(termo)),
      )
      .sort(
        (a, b) => compararValores(coluna.valor(a), coluna.valor(b), ordem.direcao) || a.m - b.m,
      );
  }, [todas, busca, texto, ordem]);

  const alterarBusca = (parcial: Partial<Record<keyof BuscaAtivos, string | null>>) =>
    void navigate({
      search: (prev: Record<string, unknown>) => {
        const novo: Record<string, unknown> = { ...prev };
        for (const [k, v] of Object.entries(parcial)) {
          if (v == null || v === TODOS) delete novo[k];
          else novo[k] = v;
        }
        return novo;
      },
      replace: true,
    });

  const ordenarPor = (c: Coluna) =>
    setOrdem((o) =>
      o.coluna === c.id
        ? { coluna: c.id, direcao: o.direcao === "asc" ? "desc" : "asc" }
        : { coluna: c.id, direcao: c.numerica ? "desc" : "asc" },
    );

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarExcel(
        visiveis,
        COLUNAS.map((c) => ({
          rotulo: c.rotulo,
          valor: c.valor,
          ...(c.formatoExcel ? { formato: c.formatoExcel } : {}),
          ...(c.larguraExcel ? { largura: c.larguraExcel } : {}),
        })),
        `ativos_${f.mesIni}_a_${f.mesFim}${f.empresa !== "TODAS" ? `_${f.empresa}` : ""}.xlsx`,
        "Ativos",
      );
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o arquivo Excel.");
    } finally {
      setExportando(false);
    }
  };

  const totais = Object.fromEntries(
    COLUNAS.filter((c) => c.somar).map((c) => [
      c.id,
      visiveis.reduce((s, r) => s + ((c.valor(r) as number | null) ?? 0), 0),
    ]),
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar M, patrimônio ou subgrupo"
            aria-label="Buscar ativos"
            className="h-9 pl-8"
          />
        </div>
        <FiltroRapido
          rotulo="Subcategoria"
          valor={busca.subcategoria}
          opcoes={opcoes.subcategorias.map((s) => ({ valor: s, rotulo: s }))}
          onChange={(v) => alterarBusca({ subcategoria: v, subgrupo: null })}
        />
        <FiltroRapido
          rotulo="Subgrupo"
          valor={busca.subgrupo}
          opcoes={opcoes.subgrupos.map((s) => ({ valor: s, rotulo: s }))}
          onChange={(v) => alterarBusca({ subgrupo: v })}
        />
        <FiltroRapido
          rotulo="Alerta"
          valor={busca.alerta}
          opcoes={(Object.keys(ALERTA_POR_SLUG) as SlugAlerta[]).map((s) => ({
            valor: s,
            rotulo: ALERTA_POR_SLUG[s],
          }))}
          onChange={(v) => alterarBusca({ alerta: v })}
        />
        <span className="text-sm text-muted-foreground">
          {formatNumero(visiveis.length)} {visiveis.length === 1 ? "ativo" : "ativos"}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-9"
          onClick={() => void exportar()}
          disabled={exportando || visiveis.length === 0}
        >
          {exportando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4" />
          )}
          Exportar Excel
        </Button>
      </div>

      <div className="max-h-[calc(100vh-260px)] min-h-[320px] overflow-auto rounded-xl border bg-card">
        <table className="w-full text-xs [&_td]:whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              {COLUNAS.map((c, i) => {
                const ativa = ordem.coluna === c.id;
                const Icone = !ativa ? ArrowUpDown : ordem.direcao === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={
                      ativa ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none"
                    }
                    className={cn(
                      "border-b px-2 py-2 font-medium text-muted-foreground",
                      c.numerica ? "text-right" : "text-left",
                      i === 0 &&
                        "sticky left-0 z-20 bg-muted shadow-[inset_-1px_0_0_var(--border)]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => ordenarPor(c)}
                      className={cn(
                        "inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground",
                        ativa && "text-foreground",
                      )}
                    >
                      {c.rotulo}
                      <Icone className={cn("size-3", !ativa && "opacity-40")} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUNAS.length}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  Nenhum ativo com esses filtros.
                </td>
              </tr>
            ) : (
              visiveis.map((r) => <LinhaAtivo key={r.m} r={r} onAbrir={() => abrir(r.m)} />)
            )}
          </tbody>
          {visiveis.length > 0 && (
            <tfoot className="sticky bottom-0 bg-muted font-semibold">
              <tr>
                {COLUNAS.map((c, i) => (
                  <td
                    key={c.id}
                    className={cn(
                      "border-t px-2 py-2 tabular-nums",
                      c.numerica ? "text-right" : "text-left",
                      i === 0 && "sticky left-0 bg-muted shadow-[inset_-1px_0_0_var(--border)]",
                    )}
                  >
                    {i === 0
                      ? "Total"
                      : c.somar
                        ? c.id === "litros"
                          ? formatNumero(totais[c.id]!)
                          : formatMoeda(totais[c.id]!)
                        : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

function LinhaAtivo({ r, onAbrir }: { r: LinhaAtivoCompleta; onAbrir: () => void }) {
  return (
    <tr
      onClick={onAbrir}
      className={cn(
        "group cursor-pointer border-b last:border-b-0 hover:bg-accent/50",
        r.semLancamento && "text-muted-foreground",
      )}
    >
      {COLUNAS.map((c, i) => (
        <td
          key={c.id}
          className={cn(
            "px-2 py-1.5",
            c.numerica && "text-right tabular-nums",
            i === 0 &&
              "sticky left-0 bg-card shadow-[inset_-1px_0_0_var(--border)] group-hover:bg-accent",
          )}
        >
          {i === 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAbrir();
              }}
              className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`Abrir ficha do M${r.m}`}
            >
              {c.celula ? c.celula(r) : String(c.valor(r) ?? "—")}
            </button>
          ) : c.celula ? (
            c.celula(r)
          ) : (
            (c.valor(r) ?? "—")
          )}
        </td>
      ))}
    </tr>
  );
}

function FiltroRapido({
  rotulo,
  valor,
  opcoes,
  onChange,
}: {
  rotulo: string;
  valor: string | undefined;
  opcoes: { valor: string; rotulo: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Select value={valor ?? TODOS} onValueChange={(v) => onChange(v === TODOS ? null : v)}>
      <SelectTrigger
        aria-label={rotulo}
        className={cn("h-9 w-auto min-w-36 max-w-72", valor && "border-primary/40 bg-primary/5")}
      >
        <span className="mr-1 text-muted-foreground">{rotulo}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>Todos</SelectItem>
        {/* mantém a opção atual mesmo se ela não aparece mais na lista */}
        {valor && !opcoes.some((o) => o.valor === valor) && (
          <SelectItem value={valor}>{valor}</SelectItem>
        )}
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
