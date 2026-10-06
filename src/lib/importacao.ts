// Importação da aba BASE da planilha Custo_Frota_Painel: funções puras de
// mapeamento, conversão e prévia. A leitura do arquivo fica em ler-planilha.ts.

import { chaveMes, type ChaveMes } from "@/lib/format";
import { normalizarTexto } from "@/lib/metricas";

/** Uma linha pronta para inserir em public.lancamentos (sem id/importacao_id). */
export type LancamentoImportado = {
  empresa: string;
  /** "AAAA-MM-01" */
  mes: string;
  m: number;
  patrimonio: string | null;
  subgrupo: string | null;
  salario: number;
  custo_combustivel: number;
  depreciacao: number;
  km_hr: number;
  litros: number;
  produto: string | null;
  qtde: number;
  valor_total: number;
  despesa: string | null;
  despesa_pai: string | null;
  conta: string | null;
  motorista: string | null;
  fazenda: string | null;
};

type Campo = keyof LancamentoImportado;

/** Cabeçalho da planilha → coluna do banco. Demais colunas (fórmulas) são ignoradas. */
export const MAPA_COLUNAS: Record<string, Campo> = {
  EMPRESA: "empresa",
  "MÊS ANO": "mes",
  M: "m",
  PATRIMONIO: "patrimonio",
  SUBGRUPO: "subgrupo",
  SALÁRIO: "salario",
  "CUSTO COMBUSTÍVEL": "custo_combustivel",
  DEPRECIAÇÃO: "depreciacao",
  "KM RODADO HR": "km_hr",
  "QUANTIDADE LITROS": "litros",
  PRODUTO: "produto",
  QTDE: "qtde",
  "VALOR TOTAL": "valor_total",
  DESPESA: "despesa",
  DESPESAPAI: "despesa_pai",
  CONTA: "conta",
  MOTORISTA: "motorista",
  "FAZ.": "fazenda",
};

export const COLUNAS_OBRIGATORIAS: Campo[] = ["empresa", "mes", "m", "valor_total"];

const CAMPOS_NUMERICOS = [
  "salario",
  "custo_combustivel",
  "depreciacao",
  "km_hr",
  "litros",
  "qtde",
  "valor_total",
] as const satisfies readonly Campo[];

const CAMPOS_TEXTO = [
  "patrimonio",
  "subgrupo",
  "produto",
  "despesa",
  "despesa_pai",
  "conta",
  "motorista",
  "fazenda",
] as const satisfies readonly Campo[];

/** Cabeçalho comparável: sem quebras de linha, espaços, acentos ou pontuação; maiúsculo. */
export function chaveCabecalho(v: unknown): string {
  return normalizarTexto(String(v ?? "")).replace(/[^A-Z0-9]/g, "");
}

const CAMPO_POR_CHAVE = new Map(
  Object.entries(MAPA_COLUNAS).map(([cab, campo]) => [chaveCabecalho(cab), campo]),
);

/** Índice de coluna de cada campo, a partir da linha de cabeçalho (primeira ocorrência vence). */
export function mapearCabecalho(cabecalho: readonly unknown[]): Partial<Record<Campo, number>> {
  const indices: Partial<Record<Campo, number>> = {};
  cabecalho.forEach((celula, i) => {
    const campo = CAMPO_POR_CHAVE.get(chaveCabecalho(celula));
    if (campo && indices[campo] == null) indices[campo] = i;
  });
  return indices;
}

/** Procura a linha de cabeçalho nas primeiras linhas (a planilha pode ter título acima). */
export function acharCabecalho(linhas: readonly (readonly unknown[])[]): number {
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const m = mapearCabecalho(linhas[i] ?? []);
    if (COLUNAS_OBRIGATORIAS.every((c) => m[c] != null)) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Conversões de célula
// ---------------------------------------------------------------------------

const MESES: Record<string, number> = {
  JAN: 1,
  FEV: 2,
  MAR: 3,
  ABR: 4,
  MAI: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SET: 9,
  OUT: 10,
  NOV: 11,
  DEZ: 12,
};

/** Data serial do Excel (dias desde 1899-12-30) → ano/mês. */
function deSerialExcel(n: number): { ano: number; mes: number } {
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

const anoCompleto = (a: number) => (a < 100 ? 2000 + a : a);

/** Converte MÊS ANO para "AAAA-MM-01" (primeiro dia do mês); null se não reconhecer. */
export function converterMes(v: unknown): string | null {
  let ano: number | null = null;
  let mes: number | null = null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    // a leitura entrega datas em UTC meia-noite
    ano = v.getUTCFullYear();
    mes = v.getUTCMonth() + 1;
  } else if (typeof v === "number" && Number.isFinite(v) && v > 20000 && v < 80000) {
    ({ ano, mes } = deSerialExcel(v));
  } else if (typeof v === "string") {
    const t = normalizarTexto(v);
    let r: RegExpExecArray | null;
    if ((r = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?/.exec(t))) {
      ano = Number(r[1]);
      mes = Number(r[2]);
    } else if ((r = /^(?:\d{1,2}\/)?(\d{1,2})\/(\d{2}|\d{4})$/.exec(t))) {
      // 01/2026 ou 15/01/2026
      mes = Number(r[1]);
      ano = anoCompleto(Number(r[2]));
    } else if ((r = /^([A-Z]{3})[A-Z]*[\s/.-]*(?:DE\s+)?(\d{2}|\d{4})$/.exec(t))) {
      // jan/26, JANEIRO/2026, jan-2026, janeiro de 2026
      mes = MESES[r[1]!] ?? null;
      ano = anoCompleto(Number(r[2]));
    } else if (/^\d+(\.\d+)?$/.test(t)) {
      return converterMes(Number(t));
    }
  }
  if (ano == null || mes == null || mes < 1 || mes > 12 || ano < 2000 || ano > 2100) return null;
  return `${chaveMes(ano, mes)}-01`;
}

/** Número de célula: aceita número ou texto pt-BR ("1.234,56"); vazio → 0; inválido → null. */
export function converterNumero(v: unknown): number | null {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return null;
  let t = String(v)
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "");
  if (t === "" || t === "-") return 0;
  // "1.234,56" → "1234.56"; "1234.56" fica; "1,5" → "1.5"
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Texto de célula: aparado; vazio ou "XXX" → null. */
export function converterTexto(v: unknown): string | null {
  if (v == null) return null;
  const t = (v instanceof Date ? v.toISOString().slice(0, 10) : String(v)).trim();
  if (t === "" || t.toUpperCase() === "XXX") return null;
  return t;
}

// ---------------------------------------------------------------------------
// Conversão da aba
// ---------------------------------------------------------------------------

export type ErroLinha = { linha: number; motivo: string };

export type ResultadoConversao = {
  lancamentos: LancamentoImportado[];
  /** Linhas descartadas por serem placeholder (PRODUTO = XXX e tudo zerado). */
  placeholders: number;
  /** Linhas totalmente vazias (ignoradas). */
  vazias: number;
  erros: ErroLinha[];
  colunasAusentes: string[];
};

const ehVazia = (linha: readonly unknown[]) =>
  linha.every((c) => c == null || (typeof c === "string" && c.trim() === ""));

/** Converte as linhas brutas da aba BASE em lançamentos. Lança erro se o cabeçalho não for achado. */
export function converterBase(linhas: readonly (readonly unknown[])[]): ResultadoConversao {
  const iCab = acharCabecalho(linhas);
  if (iCab < 0) {
    throw new Error(
      `Cabeçalho não encontrado na aba BASE. As colunas ${COLUNAS_OBRIGATORIAS.map(rotuloCampo).join(", ")} são obrigatórias.`,
    );
  }
  const indices = mapearCabecalho(linhas[iCab]!);
  const colunasAusentes = Object.entries(MAPA_COLUNAS)
    .filter(([, campo]) => indices[campo] == null)
    .map(([cab]) => cab);

  const resultado: ResultadoConversao = {
    lancamentos: [],
    placeholders: 0,
    vazias: 0,
    erros: [],
    colunasAusentes,
  };
  const celula = (linha: readonly unknown[], campo: Campo) => {
    const i = indices[campo];
    return i == null ? null : linha[i];
  };

  for (let i = iCab + 1; i < linhas.length; i++) {
    const linha = linhas[i]!;
    const numeroLinha = i + 1; // como aparece no Excel
    if (ehVazia(linha)) {
      resultado.vazias++;
      continue;
    }

    const numeros = {} as Record<(typeof CAMPOS_NUMERICOS)[number], number>;
    let invalido: string | null = null;
    for (const campo of CAMPOS_NUMERICOS) {
      const n = converterNumero(celula(linha, campo));
      if (n == null) {
        invalido = `${rotuloCampo(campo)} não é um número (“${String(celula(linha, campo))}”)`;
        break;
      }
      numeros[campo] = n;
    }

    // placeholder: PRODUTO = "XXX" e todos os valores zerados
    const produtoBruto = String(celula(linha, "produto") ?? "")
      .trim()
      .toUpperCase();
    if (produtoBruto === "XXX" && !invalido && CAMPOS_NUMERICOS.every((c) => numeros[c] === 0)) {
      resultado.placeholders++;
      continue;
    }
    if (invalido) {
      resultado.erros.push({ linha: numeroLinha, motivo: invalido });
      continue;
    }

    const empresa = converterTexto(celula(linha, "empresa"))?.toUpperCase() ?? null;
    if (!empresa) {
      resultado.erros.push({ linha: numeroLinha, motivo: "EMPRESA vazia" });
      continue;
    }
    const mes = converterMes(celula(linha, "mes"));
    if (!mes) {
      resultado.erros.push({
        linha: numeroLinha,
        motivo: `MÊS ANO não reconhecido (“${String(celula(linha, "mes") ?? "")}”)`,
      });
      continue;
    }
    const m = converterNumero(celula(linha, "m"));
    if (m == null || !Number.isInteger(m) || m <= 0 || celula(linha, "m") == null) {
      resultado.erros.push({
        linha: numeroLinha,
        motivo: `M inválido (“${String(celula(linha, "m") ?? "")}”)`,
      });
      continue;
    }

    const textos = {} as Record<(typeof CAMPOS_TEXTO)[number], string | null>;
    for (const campo of CAMPOS_TEXTO) textos[campo] = converterTexto(celula(linha, campo));

    resultado.lancamentos.push({ empresa, mes, m, ...numeros, ...textos });
  }
  return resultado;
}

export function rotuloCampo(campo: Campo): string {
  return Object.entries(MAPA_COLUNAS).find(([, c]) => c === campo)?.[0] ?? campo;
}

// ---------------------------------------------------------------------------
// Prévia
// ---------------------------------------------------------------------------

export type GrupoMesEmpresa = { mes: string; empresa: string; linhas: number; valorTotal: number };

export type Previa = {
  /** "AAAA-MM-01", em ordem. */
  meses: string[];
  grupos: GrupoMesEmpresa[];
  totalPorMes: { mes: string; linhas: number; valorTotal: number }[];
  subgruposNovos: { subgrupo: string; linhas: number; valorTotal: number }[];
  ativosNovos: { m: number; patrimonio: string | null; subgrupo: string | null; linhas: number }[];
};

/** Valor mais frequente (empate: o último visto). */
function maisFrequente(valores: (string | null)[]): string | null {
  const cont = new Map<string, number>();
  let melhor: string | null = null;
  let max = 0;
  for (const v of valores) {
    if (!v) continue;
    const n = (cont.get(v) ?? 0) + 1;
    cont.set(v, n);
    if (n >= max) {
      max = n;
      melhor = v;
    }
  }
  return melhor;
}

export function montarPrevia(
  lancamentos: readonly LancamentoImportado[],
  subgruposClassificados: readonly string[],
  msCadastrados: readonly number[],
): Previa {
  const grupos = new Map<string, GrupoMesEmpresa>();
  const porMes = new Map<string, { mes: string; linhas: number; valorTotal: number }>();
  const classificados = new Set(subgruposClassificados.map(normalizarTexto));
  const cadastrados = new Set(msCadastrados);
  const subNovos = new Map<string, { subgrupo: string; linhas: number; valorTotal: number }>();
  const msNovos = new Map<
    number,
    { patrimonios: (string | null)[]; subgrupos: (string | null)[] }
  >();

  for (const l of lancamentos) {
    const k = `${l.mes}|${l.empresa}`;
    const g = grupos.get(k) ?? { mes: l.mes, empresa: l.empresa, linhas: 0, valorTotal: 0 };
    g.linhas++;
    g.valorTotal += l.valor_total;
    grupos.set(k, g);

    const pm = porMes.get(l.mes) ?? { mes: l.mes, linhas: 0, valorTotal: 0 };
    pm.linhas++;
    pm.valorTotal += l.valor_total;
    porMes.set(l.mes, pm);

    const sub = normalizarTexto(l.subgrupo);
    if (sub && !classificados.has(sub)) {
      const s = subNovos.get(sub) ?? { subgrupo: l.subgrupo!, linhas: 0, valorTotal: 0 };
      s.linhas++;
      s.valorTotal += l.valor_total;
      subNovos.set(sub, s);
    }
    if (!cadastrados.has(l.m)) {
      const a = msNovos.get(l.m) ?? { patrimonios: [], subgrupos: [] };
      a.patrimonios.push(l.patrimonio);
      a.subgrupos.push(l.subgrupo);
      msNovos.set(l.m, a);
    }
  }

  const ordenarGrupos = (a: GrupoMesEmpresa, b: GrupoMesEmpresa) =>
    a.mes.localeCompare(b.mes) || a.empresa.localeCompare(b.empresa);
  return {
    meses: [...porMes.keys()].sort(),
    grupos: [...grupos.values()].sort(ordenarGrupos),
    totalPorMes: [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)),
    subgruposNovos: [...subNovos.values()].sort((a, b) => b.valorTotal - a.valorTotal),
    ativosNovos: [...msNovos.entries()]
      .map(([m, a]) => ({
        m,
        patrimonio: maisFrequente(a.patrimonios),
        subgrupo: maisFrequente(a.subgrupos),
        linhas: a.patrimonios.length,
      }))
      .sort((a, b) => a.m - b.m),
  };
}

/** "2026-08-01" → "2026-08". */
export const chaveDoMes = (mes: string): ChaveMes => mes.slice(0, 7);

/** Divide em lotes de até `tamanho` itens. */
export function emLotes<T>(itens: readonly T[], tamanho = 1000): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}
