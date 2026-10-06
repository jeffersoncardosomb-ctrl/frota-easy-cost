import { REGEX_CHAVE_MES, somarMeses, type ChaveMes } from "@/lib/format";

export const EMPRESAS = ["TODAS", "VC", "OL", "PALMEIRAS"] as const;
export type Empresa = (typeof EMPRESAS)[number];

/**
 * Último mês com dados carregados. Por enquanto fixo; quando a importação
 * existir, passa a vir do banco.
 */
export const ULTIMO_MES_BASE: ChaveMes = "2026-08";

/** Filtros como aparecem na query string (todos opcionais). */
export type FiltrosSearch = {
  de?: ChaveMes;
  ate?: ChaveMes;
  empresa?: Empresa;
  grupo?: string;
  patrimonio?: string;
};

/** Filtros resolvidos, com padrões aplicados. */
export type Filtros = {
  de: ChaveMes;
  ate: ChaveMes;
  empresa: Empresa;
  grupo: string | null;
  patrimonio: string | null;
};

function texto(valor: unknown): string | undefined {
  if (typeof valor === "number") return String(valor);
  if (typeof valor !== "string") return undefined;
  const t = valor.trim();
  return t === "" ? undefined : t.slice(0, 120);
}

/** Valida a query string: valores inválidos são simplesmente descartados. */
export function validarFiltrosSearch(search: Record<string, unknown>): FiltrosSearch {
  const out: FiltrosSearch = {};
  const de = texto(search["de"]);
  const ate = texto(search["ate"]);
  const empresa = texto(search["empresa"])?.toUpperCase();
  const grupo = texto(search["grupo"]);
  const patrimonio = texto(search["patrimonio"]);
  if (de && REGEX_CHAVE_MES.test(de)) out.de = de;
  if (ate && REGEX_CHAVE_MES.test(ate)) out.ate = ate;
  if (empresa && (EMPRESAS as readonly string[]).includes(empresa))
    out.empresa = empresa as Empresa;
  if (grupo) out.grupo = grupo;
  if (patrimonio) out.patrimonio = patrimonio;
  return out;
}

/** Aplica os padrões: últimos 12 meses até o último mês da base, todas as empresas. */
export function resolverFiltros(
  search: FiltrosSearch,
  ultimoMes: ChaveMes = ULTIMO_MES_BASE,
): Filtros {
  let ate = search.ate ?? ultimoMes;
  let de = search.de ?? somarMeses(ate, -11);
  if (de > ate) [de, ate] = [ate, de];
  return {
    de,
    ate,
    empresa: search.empresa ?? "TODAS",
    grupo: search.grupo ?? null,
    patrimonio: search.patrimonio ?? null,
  };
}

/** Converte filtros resolvidos de volta para a query string (explícita, para links reproduzíveis). */
export function filtrosParaSearch(f: Filtros): FiltrosSearch {
  const out: FiltrosSearch = { de: f.de, ate: f.ate, empresa: f.empresa };
  if (f.grupo) out.grupo = f.grupo;
  if (f.patrimonio) out.patrimonio = f.patrimonio;
  return out;
}
