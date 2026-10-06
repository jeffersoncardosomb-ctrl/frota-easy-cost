import type { SupabaseClient } from "@supabase/supabase-js";

import { formatMes } from "@/lib/format";
import { emLotes, type LancamentoImportado, type Previa } from "@/lib/importacao";

export type Progresso = { mensagem: string; feito: number; total: number };

export type ResultadoGravacao = { importacaoId: string; linhas: number };

/** Erro de gravação com o que já tinha sido concluído, para a tela explicar o estado. */
export class ErroGravacao extends Error {
  constructor(
    mensagem: string,
    readonly gruposConcluidos: string[],
  ) {
    super(mensagem);
    this.name = "ErroGravacao";
  }
}

const TAMANHO_LOTE = 1000;

/**
 * Para cada mês+empresa do arquivo: apaga os lançamentos existentes e insere
 * os novos em lotes de 1000. Não é uma transação única (o PostgREST não
 * oferece isso pelo navegador); em caso de falha, reimportar o mesmo arquivo
 * é seguro, porque cada mês+empresa é apagado antes de inserir.
 */
export async function gravarImportacao(
  client: SupabaseClient,
  dados: {
    arquivo: string;
    lancamentos: readonly LancamentoImportado[];
    previa: Previa;
    usuario: { id: string; email: string | null };
  },
  aoProgredir: (p: Progresso) => void,
): Promise<ResultadoGravacao> {
  const { previa, lancamentos } = dados;
  const porGrupo = new Map<string, LancamentoImportado[]>();
  for (const l of lancamentos) {
    const k = `${l.mes}|${l.empresa}`;
    const lista = porGrupo.get(k);
    if (lista) lista.push(l);
    else porGrupo.set(k, [l]);
  }
  const total =
    previa.grupos.length +
    previa.grupos.reduce((s, g) => s + Math.ceil(g.linhas / TAMANHO_LOTE), 0) +
    1;
  let feito = 0;
  const avancar = (mensagem: string) => aoProgredir({ mensagem, feito: ++feito, total });

  aoProgredir({ mensagem: "Registrando importação…", feito: 0, total });
  const importacaoId = await registrarImportacao(client, dados);
  avancar("Importação registrada");

  const concluidos: string[] = [];
  let inseridas = 0;
  try {
    for (const g of previa.grupos) {
      const rotulo = `${formatMes(g.mes.slice(0, 7))} ${g.empresa}`;
      const apagar = await client
        .from("lancamentos")
        .delete()
        .eq("mes", g.mes)
        .eq("empresa", g.empresa);
      if (apagar.error) throw new Error(`apagar ${rotulo}: ${apagar.error.message}`);
      avancar(`Apagado ${rotulo}`);

      for (const lote of emLotes(porGrupo.get(`${g.mes}|${g.empresa}`) ?? [], TAMANHO_LOTE)) {
        const inserir = await client
          .from("lancamentos")
          .insert(lote.map((l) => ({ ...l, importacao_id: importacaoId })));
        if (inserir.error) throw new Error(`inserir ${rotulo}: ${inserir.error.message}`);
        inseridas += lote.length;
        avancar(`Inserindo ${rotulo} (${inseridas.toLocaleString("pt-BR")} linhas)`);
      }
      concluidos.push(rotulo);
    }
  } catch (e) {
    await client.from("importacoes").update({ linhas: inseridas }).eq("id", importacaoId);
    throw new ErroGravacao(e instanceof Error ? e.message : String(e), concluidos);
  }

  const fim = await client.from("importacoes").update({ linhas: inseridas }).eq("id", importacaoId);
  if (fim.error) console.error("Falha ao atualizar total da importação", fim.error);
  return { importacaoId, linhas: inseridas };
}

async function registrarImportacao(
  client: SupabaseClient,
  dados: { arquivo: string; previa: Previa; usuario: { id: string; email: string | null } },
): Promise<string> {
  const registro = {
    arquivo: dados.arquivo,
    meses: dados.previa.meses,
    linhas: 0,
    criado_por: dados.usuario.id,
    criado_por_email: dados.usuario.email,
  };
  let r = await client.from("importacoes").insert(registro).select("id").single();
  // banco sem a migração de criado_por_email: grava sem o e-mail
  if (r.error && /criado_por_email/.test(r.error.message)) {
    const { criado_por_email: _email, ...semEmail } = registro;
    r = await client.from("importacoes").insert(semEmail).select("id").single();
  }
  if (r.error) throw new ErroGravacao(`registrar importação: ${r.error.message}`, []);
  return String((r.data as { id: string }).id);
}

/** Cadastra M novos na tabela ativos (não sobrescreve os existentes). */
export async function cadastrarAtivos(
  client: SupabaseClient,
  ativos: readonly { m: number; patrimonio: string | null; subgrupo: string | null }[],
): Promise<void> {
  for (const lote of emLotes(ativos, TAMANHO_LOTE)) {
    const { error } = await client.from("ativos").upsert(
      lote.map((a) => ({ m: a.m, patrimonio: a.patrimonio, subgrupo: a.subgrupo })),
      { onConflict: "m", ignoreDuplicates: true },
    );
    if (error) throw error;
  }
}

/** Quantos lançamentos já existem em cada mês+empresa (o que será substituído). */
export async function contarExistentes(
  client: SupabaseClient,
  grupos: readonly { mes: string; empresa: string }[],
): Promise<Record<string, number>> {
  const contagens = await Promise.all(
    grupos.map(async (g) => {
      const { count, error } = await client
        .from("lancamentos")
        .select("id", { count: "exact", head: true })
        .eq("mes", g.mes)
        .eq("empresa", g.empresa);
      if (error) throw error;
      return [`${g.mes}|${g.empresa}`, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(contagens);
}
