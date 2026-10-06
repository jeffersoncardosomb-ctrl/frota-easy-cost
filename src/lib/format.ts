// Formatação no padrão pt-BR usada em todo o painel.

const MESES_ABREV = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const moedaInteira = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const umaCasa = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const ateUmaCasa = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** R$ 1.234.567 (sem centavos). */
export function formatMoeda(valor: number): string {
  // Intl usa espaço inseparável depois de "R$"; trocamos por espaço comum
  // para facilitar comparação e cópia.
  return moedaInteira.format(valor).replace(/\u00a0/g, " ");
}

/** Valores grandes abreviados para cartões: R$ 1,2 mi · R$ 850 mil · R$ 3,4 bi. */
export function formatMoedaCompacta(valor: number): string {
  const abs = Math.abs(valor);
  const sinal = valor < 0 ? "-" : "";
  if (abs >= 1e9) return `${sinal}R$ ${ateUmaCasa.format(abs / 1e9)} bi`;
  if (abs >= 1e6) return `${sinal}R$ ${ateUmaCasa.format(abs / 1e6)} mi`;
  if (abs >= 1e3) return `${sinal}R$ ${ateUmaCasa.format(abs / 1e3)} mil`;
  return formatMoeda(valor);
}

/** Percentual com 1 casa. Recebe fração: 0.123 → "12,3%". */
export function formatPercentual(fracao: number): string {
  return `${umaCasa.format(fracao * 100)}%`;
}

/** Variação com sinal explícito: 0.05 → "+5,0%", -0.021 → "-2,1%". */
export function formatVariacao(fracao: number): string {
  const sinal = fracao > 0 ? "+" : "";
  return `${sinal}${formatPercentual(fracao)}`;
}

export function formatNumero(valor: number): string {
  return inteiro.format(valor);
}

/** Chave de mês no formato "AAAA-MM". */
export type ChaveMes = string;

export const REGEX_CHAVE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function chaveMes(ano: number, mes: number): ChaveMes {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function parseChaveMes(chave: ChaveMes): { ano: number; mes: number } {
  const [ano, mes] = chave.split("-").map(Number);
  return { ano: ano ?? 0, mes: mes ?? 1 };
}

/** Soma (ou subtrai) meses a uma chave "AAAA-MM". */
export function somarMeses(chave: ChaveMes, delta: number): ChaveMes {
  const { ano, mes } = parseChaveMes(chave);
  const total = ano * 12 + (mes - 1) + delta;
  return chaveMes(Math.floor(total / 12), (total % 12) + 1);
}

/** "2026-01" → "jan/26". */
export function formatMes(chave: ChaveMes): string {
  const { ano, mes } = parseChaveMes(chave);
  return `${MESES_ABREV[mes - 1] ?? "?"}/${String(ano % 100).padStart(2, "0")}`;
}

export function nomeMesAbrev(mes: number): string {
  return MESES_ABREV[mes - 1] ?? "?";
}

/** Número com casas fixas: formatDecimal(2.345, 2) → "2,35". */
export function formatDecimal(valor: number, casas = 1): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** Moeda com centavos, para custos unitários: "R$ 3,45". */
export function formatMoedaCentavos(valor: number): string {
  return `R$ ${formatDecimal(valor, 2)}`;
}
