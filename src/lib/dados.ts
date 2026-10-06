// Camada de dados do painel: busca as views/tabelas do Supabase via React Query.

import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  lerParametros,
  mesDoBanco,
  type LinhaManutClasse,
  type LinhaMensalAtivo,
  type Parametros,
  type Unidade,
} from "@/lib/metricas";

/** O PostgREST do Supabase devolve no máximo 1000 linhas por consulta. */
export const TAMANHO_PAGINA = 1000;

const DEZ_MINUTOS = 10 * 60_000;

type Linha = Record<string, unknown>;

/**
 * Busca todas as linhas de uma tabela/view paginando com .range().
 * Para só quando uma página volta vazia: se o servidor estiver configurado com
 * limite menor que TAMANHO_PAGINA, uma página "curta" não significa o fim.
 * `ordem` precisa dar uma ordenação estável, senão linhas se repetem ou somem
 * entre páginas.
 */
export async function buscarTodasAsLinhas(
  client: SupabaseClient,
  tabela: string,
  colunas: string,
  ordem: readonly string[],
): Promise<Linha[]> {
  const todas: Linha[] = [];
  for (;;) {
    let q = client.from(tabela).select(colunas);
    for (const coluna of ordem) q = q.order(coluna, { ascending: true, nullsFirst: true });
    const { data, error } = await q.range(todas.length, todas.length + TAMANHO_PAGINA - 1);
    if (error) throw error;
    const pagina = (data ?? []) as unknown as Linha[];
    if (pagina.length === 0) return todas;
    todas.push(...pagina);
  }
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const texto = (v: unknown): string | null => (v == null ? null : String(v));
const unidade = (v: unknown): Unidade => (v === "km" || v === "h" ? v : "-");

const COLUNAS_MENSAL_ATIVO =
  "empresa, mes, m, patrimonio, subgrupo, grupo, categoria, subcategoria, unidade, " +
  "combustivel, manutencao, salario, depreciacao, custo_total, km_hr, litros";

export function normalizarMensalAtivo(l: Linha): LinhaMensalAtivo {
  return {
    empresa: String(l["empresa"] ?? ""),
    mes: mesDoBanco(String(l["mes"])),
    m: num(l["m"]),
    patrimonio: texto(l["patrimonio"]),
    subgrupo: texto(l["subgrupo"]),
    grupo: texto(l["grupo"]),
    categoria: String(l["categoria"] ?? "NÃO CLASSIFICADO"),
    subcategoria: String(l["subcategoria"] ?? "NÃO CLASSIFICADO"),
    unidade: unidade(l["unidade"]),
    combustivel: num(l["combustivel"]),
    manutencao: num(l["manutencao"]),
    salario: num(l["salario"]),
    depreciacao: num(l["depreciacao"]),
    custo_total: num(l["custo_total"]),
    km_hr: num(l["km_hr"]),
    litros: num(l["litros"]),
  };
}

export function normalizarManutClasse(l: Linha): LinhaManutClasse {
  return {
    empresa: String(l["empresa"] ?? ""),
    mes: mesDoBanco(String(l["mes"])),
    m: num(l["m"]),
    grupo: texto(l["grupo"]),
    subcategoria: String(l["subcategoria"] ?? "NÃO CLASSIFICADO"),
    classe: String(l["classe"] ?? "A CLASSIFICAR"),
    manutencao: num(l["manutencao"]),
    pessoal: num(l["pessoal"]),
  };
}

/** Toda a view v_mensal_ativo (base de quase todas as telas). */
export function useMensalAtivo() {
  return useQuery({
    queryKey: ["v_mensal_ativo"],
    enabled: supabase != null,
    staleTime: DEZ_MINUTOS,
    gcTime: DEZ_MINUTOS,
    queryFn: async () =>
      (
        await buscarTodasAsLinhas(supabase!, "v_mensal_ativo", COLUNAS_MENSAL_ATIVO, [
          // colunas do GROUP BY da view: ordenação estável para paginar
          "mes",
          "empresa",
          "m",
          "subgrupo",
          "grupo",
          "categoria",
          "subcategoria",
          "unidade",
        ])
      ).map(normalizarMensalAtivo),
  });
}

/** Toda a view v_mensal_manut_classe. */
export function useManutClasse() {
  return useQuery({
    queryKey: ["v_mensal_manut_classe"],
    enabled: supabase != null,
    staleTime: DEZ_MINUTOS,
    gcTime: DEZ_MINUTOS,
    queryFn: async () =>
      (
        await buscarTodasAsLinhas(
          supabase!,
          "v_mensal_manut_classe",
          "empresa, mes, m, grupo, subcategoria, classe, manutencao, pessoal",
          ["mes", "empresa", "m", "grupo", "subcategoria", "classe"],
        )
      ).map(normalizarManutClasse),
  });
}

/** Tabela parametros como objeto chave → valor. */
export function useParametros() {
  return useQuery({
    queryKey: ["parametros"],
    enabled: supabase != null,
    staleTime: DEZ_MINUTOS,
    gcTime: DEZ_MINUTOS,
    queryFn: async (): Promise<Record<string, string>> => {
      const linhas = await buscarTodasAsLinhas(supabase!, "parametros", "chave, valor", ["chave"]);
      return Object.fromEntries(linhas.map((l) => [String(l["chave"]), String(l["valor"])]));
    },
  });
}

/** Parâmetros já tipados (com os padrões da migração para chaves ausentes). */
export function useParametrosTipados(): Parametros {
  const { data } = useParametros();
  return useMemo(() => lerParametros(data ?? {}), [data]);
}

/** Números M da tabela semirreboques (entrada do rateio). */
export function useSemirreboques() {
  return useQuery({
    queryKey: ["semirreboques"],
    enabled: supabase != null,
    staleTime: DEZ_MINUTOS,
    gcTime: DEZ_MINUTOS,
    queryFn: async (): Promise<number[]> =>
      (await buscarTodasAsLinhas(supabase!, "semirreboques", "m", ["m"])).map((l) => num(l["m"])),
  });
}
