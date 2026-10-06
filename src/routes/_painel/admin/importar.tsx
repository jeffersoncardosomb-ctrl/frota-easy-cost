import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  History,
  Loader2,
  RotateCcw,
  Tags,
  Tractor,
  Upload,
} from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";
import { EstadoConsultas } from "@/components/painel/estado-consultas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  useAtivosCadastro,
  useImportacoes,
  useSubgruposClassificados,
  type RegistroImportacao,
} from "@/lib/dados";
import { formatMes, formatMoeda, formatNumero } from "@/lib/format";
import {
  cadastrarAtivos,
  contarExistentes,
  ErroGravacao,
  gravarImportacao,
  type Progresso,
} from "@/lib/gravar-importacao";
import {
  chaveDoMes,
  converterBase,
  montarPrevia,
  type Previa,
  type ResultadoConversao,
} from "@/lib/importacao";
import { lerAba } from "@/lib/ler-planilha";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_painel/admin/importar")({
  head: () => ({ meta: [{ title: "Importar · Painel de Mecanizado" }] }),
  component: Importar,
});

type Lido = { arquivo: string; conversao: ResultadoConversao };

type Estado =
  | { fase: "inicio" }
  | { fase: "lendo"; arquivo: string }
  | { fase: "erro"; arquivo: string; mensagem: string }
  | { fase: "previa"; lido: Lido }
  | { fase: "gravando"; lido: Lido; progresso: Progresso }
  | { fase: "concluido"; lido: Lido; linhas: number }
  | { fase: "falhou"; lido: Lido; mensagem: string; concluidos: string[] };

/** Consultas que dependem dos lançamentos: recarregadas depois de importar. */
const CONSULTAS_DE_DADOS = [
  "v_mensal_ativo",
  "v_mensal_manut_classe",
  "v_lancamentos",
  "importacoes",
  "ativos-cadastro",
  "existentes",
];

function Importar() {
  const [estado, setEstado] = useState<Estado>({ fase: "inicio" });
  const subgrupos = useSubgruposClassificados();
  const cadastro = useAtivosCadastro();

  const ler = async (arquivo: File) => {
    if (!/\.xlsx$/i.test(arquivo.name)) {
      setEstado({
        fase: "erro",
        arquivo: arquivo.name,
        mensagem: "Envie um arquivo .xlsx (Excel). Arquivos .xls antigos ou .csv não são aceitos.",
      });
      return;
    }
    setEstado({ fase: "lendo", arquivo: arquivo.name });
    try {
      const linhas = await lerAba(arquivo, "BASE");
      const conversao = converterBase(linhas);
      if (conversao.lancamentos.length === 0) {
        throw new Error("Nenhuma linha válida na aba BASE.");
      }
      setEstado({ fase: "previa", lido: { arquivo: arquivo.name, conversao } });
    } catch (e) {
      console.error(e);
      setEstado({
        fase: "erro",
        arquivo: arquivo.name,
        mensagem: e instanceof Error ? e.message : "Não foi possível ler o arquivo.",
      });
    }
  };

  const recomecar = () => setEstado({ fase: "inicio" });

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Importar"
        descricao="Carga da aba BASE da planilha de custos. Cada mês+empresa do arquivo substitui o que já existe no banco."
        icone={FileUp}
      />

      {estado.fase === "inicio" || estado.fase === "erro" || estado.fase === "lendo" ? (
        <>
          <AreaArquivo onArquivo={ler} lendo={estado.fase === "lendo"} />
          {estado.fase === "erro" && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Não foi possível usar “{estado.arquivo}”</AlertTitle>
              <AlertDescription>{estado.mensagem}</AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <EstadoConsultas
          consultas={[subgrupos, cadastro]}
          esqueleto={<Skeleton className="h-96" />}
        >
          {() => (
            <PreviaEImportacao
              estado={estado}
              setEstado={setEstado}
              recomecar={recomecar}
              previa={montarPrevia(
                estado.lido.conversao.lancamentos,
                subgrupos.data!,
                cadastro.data!.map((a) => a.m),
              )}
            />
          )}
        </EstadoConsultas>
      )}

      <Historico />
    </div>
  );
}

function AreaArquivo({ onArquivo, lendo }: { onArquivo: (f: File) => void; lendo: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);
  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setSobre(false);
    const f = e.dataTransfer.files[0];
    if (f) onArquivo(f);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={soltar}
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-card p-8 text-center transition-colors",
        sobre ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      {lendo ? (
        <>
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="font-medium">Lendo a aba BASE…</p>
        </>
      ) : (
        <>
          <FileSpreadsheet className="size-9 text-primary" />
          <div>
            <p className="font-medium">Arraste o arquivo .xlsx da planilha aqui</p>
            <p className="text-sm text-muted-foreground">
              A aba BASE é lida no navegador; nada é gravado antes da sua confirmação.
            </p>
          </div>
          <Button variant="outline" onClick={() => input.current?.click()}>
            <Upload className="size-4" />
            Escolher arquivo
          </Button>
          <input
            ref={input}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label="Arquivo da planilha"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onArquivo(f);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}

function PreviaEImportacao({
  estado,
  setEstado,
  recomecar,
  previa,
}: {
  estado: Exclude<Estado, { fase: "inicio" | "lendo" | "erro" }>;
  setEstado: (e: Estado) => void;
  recomecar: () => void;
  previa: Previa;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmar, setConfirmar] = useState(false);
  const { lido } = estado;
  const { conversao } = lido;

  const existentes = useQuery({
    queryKey: ["existentes", lido.arquivo, previa.grupos.map((g) => `${g.mes}|${g.empresa}`)],
    enabled: supabase != null && estado.fase !== "gravando",
    queryFn: () => contarExistentes(supabase!, previa.grupos),
  });
  const totalExistentes = Object.values(existentes.data ?? {}).reduce((s, n) => s + n, 0);

  const importar = async () => {
    setConfirmar(false);
    if (!supabase || !user) return;
    setEstado({
      fase: "gravando",
      lido,
      progresso: { mensagem: "Iniciando…", feito: 0, total: 1 },
    });
    try {
      const r = await gravarImportacao(
        supabase,
        {
          arquivo: lido.arquivo,
          lancamentos: conversao.lancamentos,
          previa,
          usuario: { id: user.id, email: user.email ?? null },
        },
        (progresso) => setEstado({ fase: "gravando", lido, progresso }),
      );
      setEstado({ fase: "concluido", lido, linhas: r.linhas });
      toast.success(`${formatNumero(r.linhas)} lançamentos importados.`);
    } catch (e) {
      console.error(e);
      setEstado({
        fase: "falhou",
        lido,
        mensagem: e instanceof Error ? e.message : String(e),
        concluidos: e instanceof ErroGravacao ? e.gruposConcluidos : [],
      });
    } finally {
      for (const chave of CONSULTAS_DE_DADOS) {
        void queryClient.invalidateQueries({ queryKey: [chave] });
      }
    }
  };

  const valorTotal = conversao.lancamentos.reduce((s, l) => s + l.valor_total, 0);
  const gravando = estado.fase === "gravando";

  return (
    <div className="space-y-4">
      <Card className="gap-4">
        <CardHeader className="flex flex-row flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="size-4 text-primary" />
              <span className="truncate">{lido.arquivo}</span>
            </CardTitle>
            <CardDescription>
              {formatNumero(conversao.lancamentos.length)} linhas válidas ·{" "}
              {formatMoeda(valorTotal)} · {previa.meses.length}{" "}
              {previa.meses.length === 1 ? "mês" : "meses"} (
              {previa.meses.map((m) => formatMes(chaveDoMes(m))).join(", ")})
              {conversao.placeholders > 0 &&
                ` · ${formatNumero(conversao.placeholders)} linhas placeholder (XXX) descartadas`}
            </CardDescription>
          </div>
          {!gravando && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={recomecar}>
                <RotateCcw className="size-4" />
                Outro arquivo
              </Button>
              {estado.fase === "previa" && (
                <Button size="sm" onClick={() => setConfirmar(true)}>
                  <Upload className="size-4" />
                  Importar
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {estado.fase === "gravando" && (
            <div className="space-y-2" aria-live="polite">
              <Progress value={(estado.progresso.feito / estado.progresso.total) * 100} />
              <p className="text-sm text-muted-foreground">
                {estado.progresso.mensagem} ·{" "}
                {Math.round((estado.progresso.feito / estado.progresso.total) * 100)}%
              </p>
            </div>
          )}
          {estado.fase === "concluido" && (
            <Alert className="border-success/40 text-foreground">
              <CheckCircle2 className="size-4 text-success" />
              <AlertTitle>Importação concluída</AlertTitle>
              <AlertDescription>
                {formatNumero(estado.linhas)} lançamentos gravados. As telas de análise já usam os
                dados novos.
              </AlertDescription>
            </Alert>
          )}
          {estado.fase === "falhou" && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>A importação parou no meio</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{estado.mensagem}</p>
                <p>
                  {estado.concluidos.length > 0
                    ? `Já gravados: ${estado.concluidos.join(", ")}. `
                    : ""}
                  Importe o mesmo arquivo de novo: cada mês+empresa é apagado antes de inserir,
                  então repetir é seguro.
                </p>
                <Button size="sm" variant="outline" onClick={() => setConfirmar(true)}>
                  <RotateCcw className="size-4" /> Tentar de novo
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {conversao.colunasAusentes.length > 0 && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>Colunas não encontradas (ficam vazias/zeradas)</AlertTitle>
              <AlertDescription>{conversao.colunasAusentes.join(", ")}</AlertDescription>
            </Alert>
          )}
          {conversao.erros.length > 0 && <ErrosLinhas erros={conversao.erros} />}
          <TabelaGrupos previa={previa} existentes={existentes.data} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <SubgruposNovos subgrupos={previa.subgruposNovos} />
        <AtivosNovos ativos={previa.ativosNovos} />
      </div>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Importar {formatNumero(conversao.lancamentos.length)} lançamentos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Para cada um dos {previa.grupos.length} pares mês+empresa do arquivo, os lançamentos
              existentes serão apagados e substituídos
              {existentes.data ? ` (${formatNumero(totalExistentes)} linhas hoje)` : ""}. Meses e
              empresas fora do arquivo não são alterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void importar()}>
              Substituir e importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TabelaGrupos({
  previa,
  existentes,
}: {
  previa: Previa;
  existentes: Record<string, number> | undefined;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm [&_td]:whitespace-nowrap">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Mês</th>
            <th className="px-3 py-2 text-left font-medium">Empresa</th>
            <th className="px-3 py-2 text-right font-medium">Linhas no arquivo</th>
            <th className="px-3 py-2 text-right font-medium">Valor total</th>
            <th className="px-3 py-2 text-right font-medium">Linhas hoje no banco</th>
          </tr>
        </thead>
        <tbody>
          {previa.totalPorMes.map((mes) => {
            const grupos = previa.grupos.filter((g) => g.mes === mes.mes);
            return [
              ...grupos.map((g, i) => (
                <tr key={`${g.mes}|${g.empresa}`} className="border-t">
                  <td className="px-3 py-1.5 font-medium">
                    {i === 0 ? formatMes(chaveDoMes(g.mes)) : ""}
                  </td>
                  <td className="px-3 py-1.5">{g.empresa}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatNumero(g.linhas)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatMoeda(g.valorTotal)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">
                    {existentes ? formatNumero(existentes[`${g.mes}|${g.empresa}`] ?? 0) : "…"}
                  </td>
                </tr>
              )),
              <tr key={`${mes.mes}-total`} className="border-t bg-muted/30 font-semibold">
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5 text-xs text-muted-foreground">Total do mês</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumero(mes.linhas)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {formatMoeda(mes.valorTotal)}
                </td>
                <td className="px-3 py-1.5" />
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function ErrosLinhas({ erros }: { erros: { linha: number; motivo: string }[] }) {
  const LIMITE = 20;
  return (
    <Alert className="border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="size-4" />
      <AlertTitle>
        {formatNumero(erros.length)} {erros.length === 1 ? "linha ignorada" : "linhas ignoradas"}{" "}
        por erro
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-0.5 text-xs">
          {erros.slice(0, LIMITE).map((e) => (
            <li key={e.linha}>
              Linha {e.linha}: {e.motivo}
            </li>
          ))}
          {erros.length > LIMITE && <li>… e mais {formatNumero(erros.length - LIMITE)}.</li>}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function SubgruposNovos({ subgrupos }: { subgrupos: Previa["subgruposNovos"] }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="size-4 text-muted-foreground" />
          Subgrupos sem classificação ({subgrupos.length})
        </CardTitle>
        <CardDescription>
          Entram como NÃO CLASSIFICADO até serem cadastrados em Cadastros › Classificação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subgrupos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos os subgrupos do arquivo já estão classificados.
          </p>
        ) : (
          <ul className="max-h-64 divide-y overflow-auto text-sm">
            {subgrupos.map((s) => (
              <li key={s.subgrupo} className="flex gap-3 py-1.5">
                <span className="font-medium">{s.subgrupo}</span>
                <span className="ml-auto text-muted-foreground tabular-nums">
                  {formatNumero(s.linhas)} linhas · {formatMoeda(s.valorTotal)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AtivosNovos({ ativos }: { ativos: Previa["ativosNovos"] }) {
  const queryClient = useQueryClient();
  const [desmarcados, setDesmarcados] = useState<Set<number>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [cadastrados, setCadastrados] = useState<Set<number>>(new Set());
  const pendentes = ativos.filter((a) => !cadastrados.has(a.m));
  const selecionados = pendentes.filter((a) => !desmarcados.has(a.m));

  const cadastrar = async () => {
    if (!supabase) return;
    setSalvando(true);
    try {
      await cadastrarAtivos(supabase, selecionados);
      setCadastrados((s) => new Set([...s, ...selecionados.map((a) => a.m)]));
      toast.success(`${formatNumero(selecionados.length)} ativos cadastrados.`);
      void queryClient.invalidateQueries({ queryKey: ["ativos-cadastro"] });
    } catch (e) {
      console.error(e);
      toast.error(`Não foi possível cadastrar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSalvando(false);
    }
  };

  const alternar = (m: number) =>
    setDesmarcados((s) => {
      const n = new Set(s);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tractor className="size-4 text-muted-foreground" />M novos sem cadastro (
          {pendentes.length})
        </CardTitle>
        <CardDescription>
          Cadastre na tabela de ativos com o patrimônio e o subgrupo do arquivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {cadastrados.size > 0
              ? "Ativos novos cadastrados."
              : "Todos os M do arquivo já estão cadastrados."}
          </p>
        ) : (
          <>
            <ul className="max-h-64 divide-y overflow-auto text-sm">
              {pendentes.map((a) => (
                <li key={a.m}>
                  <label className="flex cursor-pointer items-center gap-3 py-1.5">
                    <Checkbox
                      checked={!desmarcados.has(a.m)}
                      onCheckedChange={() => alternar(a.m)}
                    />
                    <span className="w-14 font-semibold tabular-nums">M{a.m}</span>
                    <span className="min-w-0 flex-1 truncate">{a.patrimonio ?? "—"}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {a.subgrupo ?? "—"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              disabled={salvando || selecionados.length === 0}
              onClick={() => void cadastrar()}
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Tractor className="size-4" />
              )}
              Cadastrar {formatNumero(selecionados.length)}{" "}
              {selecionados.length === 1 ? "ativo" : "ativos"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Historico() {
  const importacoes = useImportacoes();
  const { user } = useAuth();
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-muted-foreground" />
          Histórico de importações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EstadoConsultas consultas={[importacoes]} esqueleto={<Skeleton className="h-32" />}>
          {() =>
            importacoes.data!.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma importação ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-2 py-2 text-left font-medium">Quando</th>
                      <th className="px-2 py-2 text-left font-medium">Arquivo</th>
                      <th className="px-2 py-2 text-left font-medium">Meses</th>
                      <th className="px-2 py-2 text-right font-medium">Linhas</th>
                      <th className="px-2 py-2 text-left font-medium">Quem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importacoes.data!.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                          {new Date(r.criadoEm).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td
                          className="max-w-64 truncate px-2 py-1.5"
                          title={r.arquivo ?? undefined}
                        >
                          {r.arquivo ?? "—"}
                        </td>
                        <td className="px-2 py-1.5">{resumirMeses(r.meses)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {formatNumero(r.linhas)}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {quem(r, user?.id, user?.email)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </EstadoConsultas>
      </CardContent>
    </Card>
  );
}

function resumirMeses(meses: string[]): string {
  if (meses.length === 0) return "—";
  if (meses.length <= 3) return meses.map(formatMes).join(", ");
  return `${formatMes(meses[0]!)} a ${formatMes(meses.at(-1)!)} (${meses.length})`;
}

function quem(
  r: RegistroImportacao,
  meuId: string | undefined,
  meuEmail: string | undefined,
): string {
  if (r.criadoPorEmail) return r.criadoPorEmail;
  if (r.criadoPor && r.criadoPor === meuId) return meuEmail ?? "você";
  return r.criadoPor ? `usuário ${r.criadoPor.slice(0, 8)}` : "—";
}
