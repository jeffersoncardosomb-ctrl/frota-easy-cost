// Cálculos do painel: funções puras sobre as linhas de v_mensal_ativo e
// v_mensal_manut_classe. Nada aqui acessa rede ou React.

import { REGEX_CHAVE_MES, somarMeses, type ChaveMes } from "@/lib/format";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Unidade = "km" | "h" | "-";

/** Uma linha de v_mensal_ativo, com `mes` já como "AAAA-MM" e números como number. */
export type LinhaMensalAtivo = {
  empresa: string;
  mes: ChaveMes;
  m: number;
  patrimonio: string | null;
  subgrupo: string | null;
  grupo: string | null;
  categoria: string;
  subcategoria: string;
  unidade: Unidade;
  combustivel: number;
  manutencao: number;
  salario: number;
  depreciacao: number;
  custo_total: number;
  km_hr: number;
  litros: number;
};

/** Uma linha de v_mensal_manut_classe. */
export type LinhaManutClasse = {
  empresa: string;
  mes: ChaveMes;
  m: number;
  grupo: string | null;
  subcategoria: string;
  classe: string;
  manutencao: number;
  pessoal: number;
};

export type FiltroMetricas = {
  mesIni: ChaveMes;
  mesFim: ChaveMes;
  /** "TODAS" = sem filtro. */
  empresa: string;
  /** "TODOS" ou null = sem filtro. Comparação sem diferenciar maiúsculas. */
  grupo: string | null;
  /** Número do patrimônio (coluna M); null = sem filtro. */
  m: number | null;
};

export type Parametros = {
  rateio_subgrupo: string;
  alerta_consumo_desvio: number;
  alerta_consumo_min_litros: number;
  alerta_manut_min: number;
  alerta_manut_multiplo: number;
};

/** Mesmos valores do insert inicial da migração; usados se a chave faltar no banco. */
export const PARAMETROS_PADRAO: Parametros = {
  rateio_subgrupo: "CAVALO MECÂNICO",
  alerta_consumo_desvio: 0.25,
  alerta_consumo_min_litros: 50,
  alerta_manut_min: 5000,
  alerta_manut_multiplo: 3,
};

/** Converte o objeto chave/valor da tabela parametros em valores tipados. */
export function lerParametros(registro: Record<string, string>): Parametros {
  const num = (chave: keyof Parametros, padrao: number) => {
    const bruto = registro[chave];
    // aceita vírgula decimal digitada no cadastro
    const v = bruto == null ? NaN : Number(bruto.trim().replace(",", "."));
    return Number.isFinite(v) ? v : padrao;
  };
  return {
    rateio_subgrupo: registro["rateio_subgrupo"]?.trim() || PARAMETROS_PADRAO.rateio_subgrupo,
    alerta_consumo_desvio: num("alerta_consumo_desvio", PARAMETROS_PADRAO.alerta_consumo_desvio),
    alerta_consumo_min_litros: num(
      "alerta_consumo_min_litros",
      PARAMETROS_PADRAO.alerta_consumo_min_litros,
    ),
    alerta_manut_min: num("alerta_manut_min", PARAMETROS_PADRAO.alerta_manut_min),
    alerta_manut_multiplo: num("alerta_manut_multiplo", PARAMETROS_PADRAO.alerta_manut_multiplo),
  };
}

// ---------------------------------------------------------------------------
// Períodos
// ---------------------------------------------------------------------------

export type Periodo = { ini: ChaveMes; fim: ChaveMes };

/** Quantidade de meses de ini a fim, inclusive. */
export function mesesNoPeriodo({ ini, fim }: Periodo): number {
  const [ai, mi] = ini.split("-").map(Number);
  const [af, mf] = fim.split("-").map(Number);
  return (af! - ai!) * 12 + (mf! - mi!) + 1;
}

/** Mesmo número de meses imediatamente antes de ini. */
export function periodoAnterior(p: Periodo): Periodo {
  const n = mesesNoPeriodo(p);
  return { ini: somarMeses(p.ini, -n), fim: somarMeses(p.ini, -1) };
}

/** Mesmos meses, um ano antes. */
export function mesmoPeriodoAnoAnterior(p: Periodo): Periodo {
  return { ini: somarMeses(p.ini, -12), fim: somarMeses(p.fim, -12) };
}

/** 12 meses terminando em fim. */
export function janela12m(fim: ChaveMes): Periodo {
  return { ini: somarMeses(fim, -11), fim };
}

/** Os 12 meses anteriores à janela 12m. */
export function janela12mAnterior(fim: ChaveMes): Periodo {
  return janela12m(somarMeses(fim, -12));
}

/** Lista de meses de ini a fim, inclusive. */
export function listarMeses({ ini, fim }: Periodo): ChaveMes[] {
  const meses: ChaveMes[] = [];
  for (let mes = ini; mes <= fim; mes = somarMeses(mes, 1)) meses.push(mes);
  return meses;
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

const igual = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").trim().toUpperCase() === (b ?? "").trim().toUpperCase();

function semFiltroGrupo(grupo: string | null): boolean {
  return grupo == null || grupo.trim() === "" || igual(grupo, "TODOS");
}

function semFiltroEmpresa(empresa: string): boolean {
  return empresa.trim() === "" || igual(empresa, "TODAS");
}

type ComMes = { mes: ChaveMes };

export function noPeriodo<T extends ComMes>(linhas: readonly T[], p: Periodo): T[] {
  return linhas.filter((l) => l.mes >= p.ini && l.mes <= p.fim);
}

/** Aplica só o filtro de empresa. */
export function filtrarEmpresa<T extends { empresa: string }>(
  linhas: readonly T[],
  empresa: string,
): T[] {
  return semFiltroEmpresa(empresa) ? [...linhas] : linhas.filter((l) => igual(l.empresa, empresa));
}

/** Aplica empresa, grupo e M (sem período). */
export function filtrarDimensoes<T extends { empresa: string; grupo: string | null; m: number }>(
  linhas: readonly T[],
  f: Pick<FiltroMetricas, "empresa" | "grupo" | "m">,
): T[] {
  return filtrarEmpresa(linhas, f.empresa).filter(
    (l) => (semFiltroGrupo(f.grupo) || igual(l.grupo, f.grupo)) && (f.m == null || l.m === f.m),
  );
}

/** Aplica todos os filtros, inclusive o período mesIni..mesFim. */
export function filtrarLinhas<
  T extends ComMes & { empresa: string; grupo: string | null; m: number },
>(linhas: readonly T[], f: FiltroMetricas): T[] {
  return noPeriodo(filtrarDimensoes(linhas, f), { ini: f.mesIni, fim: f.mesFim });
}

// ---------------------------------------------------------------------------
// Totais
// ---------------------------------------------------------------------------

export type Totais = {
  combustivel: number;
  manutencao: number;
  salario: number;
  depreciacao: number;
  custo_total: number;
  litros: number;
  /** Fração de cada componente no custo total (null se o custo total é zero). */
  pct: {
    combustivel: number | null;
    manutencao: number | null;
    salario: number | null;
    depreciacao: number | null;
  };
  /** combustível / litros (null sem litros). */
  reaisPorLitro: number | null;
};

const dividir = (a: number, b: number): number | null => (b === 0 ? null : a / b);

export function somarTotais(linhas: readonly LinhaMensalAtivo[]): Totais {
  let combustivel = 0;
  let manutencao = 0;
  let salario = 0;
  let depreciacao = 0;
  let custo_total = 0;
  let litros = 0;
  for (const l of linhas) {
    combustivel += l.combustivel;
    manutencao += l.manutencao;
    salario += l.salario;
    depreciacao += l.depreciacao;
    custo_total += l.custo_total;
    litros += l.litros;
  }
  return {
    combustivel,
    manutencao,
    salario,
    depreciacao,
    custo_total,
    litros,
    pct: {
      combustivel: dividir(combustivel, custo_total),
      manutencao: dividir(manutencao, custo_total),
      salario: dividir(salario, custo_total),
      depreciacao: dividir(depreciacao, custo_total),
    },
    reaisPorLitro: dividir(combustivel, litros),
  };
}

export type ResumoPeriodo = {
  periodos: {
    atual: Periodo;
    anterior: Periodo;
    anoAnterior: Periodo;
    ultimos12m: Periodo;
    anteriores12m: Periodo;
  };
  atual: Totais;
  anterior: Totais;
  anoAnterior: Totais;
  ultimos12m: Totais;
  anteriores12m: Totais;
};

/** Totais do período filtrado e das janelas de comparação (mesmos filtros de empresa/grupo/M). */
export function resumoPeriodo(
  linhas: readonly LinhaMensalAtivo[],
  f: FiltroMetricas,
): ResumoPeriodo {
  const base = filtrarDimensoes(linhas, f);
  const atual = { ini: f.mesIni, fim: f.mesFim };
  const periodos = {
    atual,
    anterior: periodoAnterior(atual),
    anoAnterior: mesmoPeriodoAnoAnterior(atual),
    ultimos12m: janela12m(f.mesFim),
    anteriores12m: janela12mAnterior(f.mesFim),
  };
  const totais = (p: Periodo) => somarTotais(noPeriodo(base, p));
  return {
    periodos,
    atual: totais(periodos.atual),
    anterior: totais(periodos.anterior),
    anoAnterior: totais(periodos.anoAnterior),
    ultimos12m: totais(periodos.ultimos12m),
    anteriores12m: totais(periodos.anteriores12m),
  };
}

/** Variação relativa (atual / anterior - 1); null quando não há base de comparação. */
export function variacao(atual: number, anterior: number): number | null {
  return anterior === 0 ? null : atual / anterior - 1;
}

// ---------------------------------------------------------------------------
// Eficiência (consumo e custo por km ou por hora)
// ---------------------------------------------------------------------------

export type Eficiencia = {
  unidade: Unidade;
  km_hr: number;
  litros: number;
  custo_total: number;
  /** km: km/litro · h: litros/hora · '-': null. */
  consumo: number | null;
  /** km: R$/km · h: R$/hora · '-': null. */
  custoPorUnidade: number | null;
};

/** Eficiência de um conjunto de linhas da MESMA unidade (nunca soma km com horas). */
export function calcularEficiencia(
  unidade: Unidade,
  km_hr: number,
  litros: number,
  custo_total: number,
): Eficiencia {
  let consumo: number | null = null;
  let custoPorUnidade: number | null = null;
  if (unidade === "km") {
    consumo = dividir(km_hr, litros);
    custoPorUnidade = dividir(custo_total, km_hr);
  } else if (unidade === "h") {
    consumo = dividir(litros, km_hr);
    custoPorUnidade = dividir(custo_total, km_hr);
  }
  return { unidade, km_hr, litros, custo_total, consumo, custoPorUnidade };
}

export type EficienciaSubgrupo = Eficiencia & {
  subgrupo: string;
  categoria: string;
  subcategoria: string;
  ativos: number;
};

/** Agrupa linhas por subgrupo + unidade e soma km_hr, litros e custo. */
function agruparPorSubgrupo(linhas: readonly LinhaMensalAtivo[]) {
  const grupos = new Map<
    string,
    {
      subgrupo: string;
      unidade: Unidade;
      categoria: string;
      subcategoria: string;
      km_hr: number;
      litros: number;
      custo_total: number;
      ms: Set<number>;
    }
  >();
  for (const l of linhas) {
    const subgrupo = (l.subgrupo ?? "").trim().toUpperCase() || "SEM SUBGRUPO";
    // a unidade entra na chave para km e horas nunca caírem na mesma soma
    const chave = `${subgrupo}|${l.unidade}`;
    let g = grupos.get(chave);
    if (!g) {
      g = {
        subgrupo,
        unidade: l.unidade,
        categoria: l.categoria,
        subcategoria: l.subcategoria,
        km_hr: 0,
        litros: 0,
        custo_total: 0,
        ms: new Set(),
      };
      grupos.set(chave, g);
    }
    g.km_hr += l.km_hr;
    g.litros += l.litros;
    g.custo_total += l.custo_total;
    g.ms.add(l.m);
  }
  return grupos;
}

export function eficienciaPorSubgrupo(
  linhas: readonly LinhaMensalAtivo[],
  f: FiltroMetricas,
): EficienciaSubgrupo[] {
  return [...agruparPorSubgrupo(filtrarLinhas(linhas, f)).values()]
    .map((g) => ({
      ...calcularEficiencia(g.unidade, g.km_hr, g.litros, g.custo_total),
      subgrupo: g.subgrupo,
      categoria: g.categoria,
      subcategoria: g.subcategoria,
      ativos: g.ms.size,
    }))
    .sort((a, b) => b.custo_total - a.custo_total);
}

// ---------------------------------------------------------------------------
// Série mensal (tendência)
// ---------------------------------------------------------------------------

export type PontoSerie = {
  mes: ChaveMes;
  combustivel: number;
  manutencao: number;
  salario: number;
  depreciacao: number;
  custo_total: number;
  litros: number;
  /** Variação do custo total x mês anterior. */
  varMesAnterior: number | null;
  /** Variação do custo total x mesmo mês do ano anterior. */
  varAnoAnterior: number | null;
  /**
   * Média do custo total nos 12 meses terminando neste mês. Meses anteriores
   * ao primeiro mês da base não entram na conta; null se nenhum entra.
   */
  mediaMovel12m: number | null;
};

export function serieMensal(linhas: readonly LinhaMensalAtivo[], f: FiltroMetricas): PontoSerie[] {
  const base = filtrarDimensoes(linhas, f);
  const porMes = new Map<ChaveMes, LinhaMensalAtivo[]>();
  for (const l of base) {
    const lista = porMes.get(l.mes);
    if (lista) lista.push(l);
    else porMes.set(l.mes, [l]);
  }
  const custoDoMes = (mes: ChaveMes) =>
    (porMes.get(mes) ?? []).reduce((s, l) => s + l.custo_total, 0);

  // primeiro mês com dados na base inteira (não só no recorte)
  let primeiroMesBase: ChaveMes | null = null;
  for (const l of linhas)
    if (primeiroMesBase == null || l.mes < primeiroMesBase) primeiroMesBase = l.mes;

  return listarMeses({ ini: f.mesIni, fim: f.mesFim }).map((mes) => {
    const t = somarTotais(porMes.get(mes) ?? []);
    const janela = listarMeses(janela12m(mes)).filter(
      (m) => primeiroMesBase != null && m >= primeiroMesBase,
    );
    const soma12 = janela.reduce((s, m) => s + custoDoMes(m), 0);
    return {
      mes,
      combustivel: t.combustivel,
      manutencao: t.manutencao,
      salario: t.salario,
      depreciacao: t.depreciacao,
      custo_total: t.custo_total,
      litros: t.litros,
      varMesAnterior: variacao(t.custo_total, custoDoMes(somarMeses(mes, -1))),
      varAnoAnterior: variacao(t.custo_total, custoDoMes(somarMeses(mes, -12))),
      mediaMovel12m: janela.length > 0 ? soma12 / janela.length : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Tabela de ativos e alertas
// ---------------------------------------------------------------------------

export const ALERTAS = {
  SEM_USO_COM_CUSTO: "SEM USO C/ CUSTO",
  ABASTECEU_SEM_KM_H: "ABASTECEU SEM KM/H",
  CONSUMO_FORA_PADRAO: "CONSUMO FORA DO PADRÃO",
  MANUTENCAO_ATIPICA: "MANUTENÇÃO ATÍPICA",
} as const;

export type Alerta = (typeof ALERTAS)[keyof typeof ALERTAS];

export type LinhaTabelaAtivo = Eficiencia & {
  m: number;
  patrimonio: string | null;
  empresas: string[];
  subgrupo: string | null;
  grupo: string | null;
  categoria: string;
  subcategoria: string;
  combustivel: number;
  manutencao: number;
  salario: number;
  depreciacao: number;
  /** Manutenção do ativo nos 12 meses terminando em mesFim. */
  manutencao12m: number;
  /** Consumo 12m do subgrupo do ativo (mesma unidade), referência para o alerta. */
  consumoRef12m: number | null;
  /** consumo do ativo / consumo de referência - 1. */
  desvioConsumo: number | null;
  alertas: Alerta[];
};

/** Linha mais recente define patrimônio, subgrupo, grupo e unidade do ativo. */
function maisRecente(linhas: readonly LinhaMensalAtivo[]): LinhaMensalAtivo {
  return linhas.reduce((a, b) => (b.mes > a.mes ? b : a));
}

/**
 * Uma linha por ativo (M) no período filtrado, com totais, eficiência e alertas.
 * As referências (consumo 12m do subgrupo e manutenção 12m) respeitam só o
 * filtro de empresa: grupo e M recortam a lista, não a régua de comparação.
 */
export function tabelaAtivos(
  linhas: readonly LinhaMensalAtivo[],
  f: FiltroMetricas,
  parametros: Parametros,
): LinhaTabelaAtivo[] {
  const daEmpresa = filtrarEmpresa(linhas, f.empresa);
  const doPeriodo = filtrarLinhas(linhas, f);
  const janela = janela12m(f.mesFim);
  const ultimos12m = noPeriodo(daEmpresa, janela);

  const refSubgrupo = agruparPorSubgrupo(ultimos12m);
  const manut12m = new Map<number, number>();
  for (const l of ultimos12m) manut12m.set(l.m, (manut12m.get(l.m) ?? 0) + l.manutencao);

  const porAtivo = new Map<number, LinhaMensalAtivo[]>();
  for (const l of doPeriodo) {
    const lista = porAtivo.get(l.m);
    if (lista) lista.push(l);
    else porAtivo.set(l.m, [l]);
  }

  const resultado: LinhaTabelaAtivo[] = [];
  for (const [m, doAtivo] of porAtivo) {
    const ref = maisRecente(doAtivo);
    const totais = somarTotais(doAtivo);
    // km/horas só da unidade atual do ativo: nunca soma km com horas
    const mesmaUnidade = doAtivo.filter((l) => l.unidade === ref.unidade);
    const km_hr = mesmaUnidade.reduce((s, l) => s + l.km_hr, 0);
    const litros = mesmaUnidade.reduce((s, l) => s + l.litros, 0);
    const efic = calcularEficiencia(ref.unidade, km_hr, litros, totais.custo_total);

    const sub = refSubgrupo.get(
      `${(ref.subgrupo ?? "").trim().toUpperCase() || "SEM SUBGRUPO"}|${ref.unidade}`,
    );
    const consumoRef12m = sub
      ? calcularEficiencia(sub.unidade, sub.km_hr, sub.litros, sub.custo_total).consumo
      : null;
    const desvioConsumo =
      efic.consumo != null && consumoRef12m != null && consumoRef12m !== 0
        ? efic.consumo / consumoRef12m - 1
        : null;
    const manutencao12m = manut12m.get(m) ?? 0;

    const alertas: Alerta[] = [];
    if (ref.unidade !== "-" && totais.custo_total > 0 && km_hr === 0 && litros === 0) {
      alertas.push(ALERTAS.SEM_USO_COM_CUSTO);
    }
    if (litros > 0 && km_hr === 0) alertas.push(ALERTAS.ABASTECEU_SEM_KM_H);
    if (litros >= parametros.alerta_consumo_min_litros && desvioConsumo != null) {
      const limite = parametros.alerta_consumo_desvio;
      if (
        (ref.unidade === "km" && desvioConsumo < -limite) ||
        (ref.unidade === "h" && desvioConsumo > limite)
      ) {
        alertas.push(ALERTAS.CONSUMO_FORA_PADRAO);
      }
    }
    if (
      totais.manutencao > parametros.alerta_manut_min &&
      totais.manutencao > parametros.alerta_manut_multiplo * (manutencao12m / 12)
    ) {
      alertas.push(ALERTAS.MANUTENCAO_ATIPICA);
    }

    resultado.push({
      ...efic,
      m,
      patrimonio: ref.patrimonio,
      empresas: [...new Set(doAtivo.map((l) => l.empresa))].sort(),
      subgrupo: ref.subgrupo,
      grupo: ref.grupo,
      categoria: ref.categoria,
      subcategoria: ref.subcategoria,
      combustivel: totais.combustivel,
      manutencao: totais.manutencao,
      salario: totais.salario,
      depreciacao: totais.depreciacao,
      manutencao12m,
      consumoRef12m,
      desvioConsumo,
      alertas,
    });
  }
  return resultado.sort((a, b) => b.custo_total - a.custo_total);
}

// ---------------------------------------------------------------------------
// Rateio de semirreboques
// ---------------------------------------------------------------------------

export type RateioSemirreboques = {
  /** Custo total dos semirreboques no período (respeitando empresa). */
  custoReboques: number;
  /** km total dos cavalos mecânicos no período. */
  kmCavalos: number;
  /** custoReboques / kmCavalos (null sem km). */
  reaisPorKm: number | null;
  porCavalo: { m: number; patrimonio: string | null; km: number; custo_reboque: number }[];
};

export function rateioSemirreboques(
  linhas: readonly LinhaMensalAtivo[],
  f: Pick<FiltroMetricas, "mesIni" | "mesFim" | "empresa">,
  semirreboques: readonly number[],
  parametros: Pick<Parametros, "rateio_subgrupo">,
): RateioSemirreboques {
  const base = noPeriodo(filtrarEmpresa(linhas, f.empresa), { ini: f.mesIni, fim: f.mesFim });
  const reboques = new Set(semirreboques);

  const custoReboques = base
    .filter((l) => reboques.has(l.m))
    .reduce((s, l) => s + l.custo_total, 0);

  const cavalos = new Map<number, { patrimonio: string | null; km: number; mes: ChaveMes }>();
  for (const l of base) {
    if (!igual(l.subgrupo, parametros.rateio_subgrupo)) continue;
    const c = cavalos.get(l.m);
    if (!c) cavalos.set(l.m, { patrimonio: l.patrimonio, km: l.km_hr, mes: l.mes });
    else {
      c.km += l.km_hr;
      if (l.mes > c.mes) {
        c.mes = l.mes;
        c.patrimonio = l.patrimonio;
      }
    }
  }
  const kmCavalos = [...cavalos.values()].reduce((s, c) => s + c.km, 0);
  const reaisPorKm = dividir(custoReboques, kmCavalos);

  return {
    custoReboques,
    kmCavalos,
    reaisPorKm,
    porCavalo: [...cavalos.entries()]
      .map(([m, c]) => ({
        m,
        patrimonio: c.patrimonio,
        km: c.km,
        custo_reboque: reaisPorKm == null ? 0 : c.km * reaisPorKm,
      }))
      .sort((a, b) => b.custo_reboque - a.custo_reboque),
  };
}

// ---------------------------------------------------------------------------
// Ponte com os filtros da URL
// ---------------------------------------------------------------------------

/** Converte os filtros da barra (URL) para o formato das métricas. */
export function filtroDaUrl(f: {
  de: ChaveMes;
  ate: ChaveMes;
  empresa: string;
  grupo: string | null;
  patrimonio: string | null;
}): FiltroMetricas {
  const m = f.patrimonio != null && /^\d+$/.test(f.patrimonio) ? Number(f.patrimonio) : null;
  return { mesIni: f.de, mesFim: f.ate, empresa: f.empresa, grupo: f.grupo, m };
}

/** "2026-08-01" (date do Postgres) → "2026-08". */
export function mesDoBanco(valor: string): ChaveMes {
  const chave = valor.slice(0, 7);
  if (!REGEX_CHAVE_MES.test(chave)) throw new Error(`Mês inválido vindo do banco: ${valor}`);
  return chave;
}
