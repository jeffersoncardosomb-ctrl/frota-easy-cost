import { ALERTAS, type Alerta } from "@/lib/metricas";

/** Apelidos curtos dos alertas para a URL da tela Ativos (?alerta=consumo). */
export const ALERTA_POR_SLUG = {
  "sem-uso": ALERTAS.SEM_USO_COM_CUSTO,
  "sem-km": ALERTAS.ABASTECEU_SEM_KM_H,
  consumo: ALERTAS.CONSUMO_FORA_PADRAO,
  manutencao: ALERTAS.MANUTENCAO_ATIPICA,
} as const satisfies Record<string, Alerta>;

export type SlugAlerta = keyof typeof ALERTA_POR_SLUG;

export const SLUG_POR_ALERTA = Object.fromEntries(
  Object.entries(ALERTA_POR_SLUG).map(([slug, alerta]) => [alerta, slug]),
) as Record<Alerta, SlugAlerta>;

/** Filtros extras da tela Ativos, além dos filtros gerais da barra. */
export type BuscaAtivos = { subcategoria?: string; subgrupo?: string; alerta?: SlugAlerta };

export function validarBuscaAtivos(search: Record<string, unknown>): BuscaAtivos {
  const out: BuscaAtivos = {};
  const sub = typeof search["subcategoria"] === "string" ? search["subcategoria"].trim() : "";
  if (sub) out.subcategoria = sub.slice(0, 80);
  const subgrupo = typeof search["subgrupo"] === "string" ? search["subgrupo"].trim() : "";
  if (subgrupo) out.subgrupo = subgrupo.slice(0, 80);
  const alerta = search["alerta"];
  if (typeof alerta === "string" && alerta in ALERTA_POR_SLUG) out.alerta = alerta as SlugAlerta;
  return out;
}
