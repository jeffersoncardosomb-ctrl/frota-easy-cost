import type { ReactNode } from "react";

import { EtiquetaAlerta } from "@/components/ativos/etiqueta-alerta";
import {
  formatDecimal,
  formatMoeda,
  formatMoedaCentavos,
  formatNumero,
  formatVariacao,
} from "@/lib/format";
import type { LinhaAtivoCompleta, Unidade } from "@/lib/metricas";
import { cn } from "@/lib/utils";

type Valor = number | string | null;

export type Coluna = {
  id: string;
  rotulo: string;
  /** Valor bruto: usado para ordenar e para o Excel. */
  valor: (r: LinhaAtivoCompleta) => Valor;
  /** Como aparece na tela (padrão: o valor formatado). */
  celula?: (r: LinhaAtivoCompleta) => ReactNode;
  numerica?: boolean;
  /** Soma no rodapé. */
  somar?: boolean;
  /** Formato numérico do Excel. */
  formatoExcel?: string;
  larguraExcel?: number;
};

const SUFIXO_CONSUMO: Record<Unidade, string> = { km: "km/L", h: "L/h", "-": "" };
const SUFIXO_UNIDADE: Record<Unidade, string> = { km: "km", h: "h", "-": "" };

const moeda = (id: keyof LinhaAtivoCompleta, rotulo: string, somar = true): Coluna => ({
  id,
  rotulo,
  valor: (r) => r[id] as number,
  celula: (r) => formatMoeda(r[id] as number),
  numerica: true,
  somar,
  formatoExcel: "#,##0.00",
  larguraExcel: 14,
});

const casas = (u: Unidade) => (u === "km" ? 2 : 1);

export const COLUNAS: Coluna[] = [
  {
    id: "m",
    rotulo: "M",
    valor: (r) => r.m,
    celula: (r) => <span className="font-semibold">M{r.m}</span>,
    numerica: true,
    formatoExcel: "0",
    larguraExcel: 8,
  },
  {
    id: "patrimonio",
    rotulo: "Patrimônio",
    valor: (r) => r.patrimonio,
    celula: (r) => (
      <span className="block max-w-56 truncate" title={r.patrimonio ?? undefined}>
        {r.patrimonio ?? "—"}
        {r.semLancamento && (
          <span className="ml-1.5 text-[11px] text-muted-foreground">(sem lançamento)</span>
        )}
      </span>
    ),
    larguraExcel: 30,
  },
  { id: "subgrupo", rotulo: "Subgrupo", valor: (r) => r.subgrupo, larguraExcel: 20 },
  {
    id: "unidade",
    rotulo: "Unid.",
    valor: (r) => (r.unidade === "-" ? null : r.unidade),
    celula: (r) => (r.unidade === "-" ? "—" : r.unidade),
    larguraExcel: 6,
  },
  moeda("combustivel", "Combustível"),
  moeda("manutencao", "Manutenção"),
  moeda("salario", "Salário"),
  moeda("depreciacao", "Depreciação"),
  {
    ...moeda("custo_total", "Custo total"),
    celula: (r) => <span className="font-medium">{formatMoeda(r.custo_total)}</span>,
  },
  {
    id: "km_hr",
    rotulo: "Km / h",
    valor: (r) => (r.unidade === "-" ? null : r.km_hr),
    celula: (r) =>
      r.unidade === "-" ? "—" : `${formatNumero(r.km_hr)} ${SUFIXO_UNIDADE[r.unidade]}`,
    numerica: true,
    formatoExcel: "#,##0",
    larguraExcel: 10,
  },
  {
    id: "litros",
    rotulo: "Litros",
    valor: (r) => r.litros,
    celula: (r) => formatNumero(r.litros),
    numerica: true,
    somar: true,
    formatoExcel: "#,##0",
    larguraExcel: 10,
  },
  {
    id: "consumo",
    rotulo: "Consumo",
    valor: (r) => r.consumo,
    celula: (r) =>
      r.consumo == null
        ? "—"
        : `${formatDecimal(r.consumo, casas(r.unidade))} ${SUFIXO_CONSUMO[r.unidade]}`,
    numerica: true,
    formatoExcel: "#,##0.00",
    larguraExcel: 10,
  },
  {
    id: "custoPorUnidade",
    rotulo: "R$ por km/h",
    valor: (r) => r.custoPorUnidade,
    celula: (r) =>
      r.custoPorUnidade == null
        ? "—"
        : `${formatMoedaCentavos(r.custoPorUnidade)}/${SUFIXO_UNIDADE[r.unidade]}`,
    numerica: true,
    formatoExcel: "#,##0.00",
    larguraExcel: 12,
  },
  {
    id: "custoReboque",
    rotulo: "Custo reboque",
    valor: (r) => r.custoReboque,
    celula: (r) => (r.custoReboque == null ? "" : formatMoeda(r.custoReboque)),
    numerica: true,
    somar: true,
    formatoExcel: "#,##0.00",
    larguraExcel: 14,
  },
  {
    id: "custoPorKmComReboque",
    rotulo: "R$/km + semirreboque",
    valor: (r) => r.custoPorKmComReboque,
    celula: (r) =>
      r.custoPorKmComReboque == null ? "" : `${formatMoedaCentavos(r.custoPorKmComReboque)}/km`,
    numerica: true,
    formatoExcel: "#,##0.00",
    larguraExcel: 14,
  },
  moeda("custo12m", "Custo 12m"),
  moeda("manutMediaMensal12m", "Manut. média mensal 12m"),
  {
    id: "consumoRef12m",
    rotulo: "Consumo ref. subgrupo",
    valor: (r) => r.consumoRef12m,
    celula: (r) =>
      r.consumoRef12m == null
        ? "—"
        : `${formatDecimal(r.consumoRef12m, casas(r.unidade))} ${SUFIXO_CONSUMO[r.unidade]}`,
    numerica: true,
    formatoExcel: "#,##0.00",
    larguraExcel: 12,
  },
  {
    id: "desvioConsumo",
    rotulo: "Desvio %",
    valor: (r) => r.desvioConsumo,
    celula: (r) => {
      if (r.desvioConsumo == null) return "—";
      // km/L abaixo da referência ou L/h acima = pior
      const pior = r.unidade === "km" ? r.desvioConsumo < 0 : r.desvioConsumo > 0;
      return (
        <span className={cn("font-medium", pior ? "text-destructive" : "text-success")}>
          {formatVariacao(r.desvioConsumo)}
        </span>
      );
    },
    numerica: true,
    formatoExcel: "0.0%",
    larguraExcel: 10,
  },
  {
    id: "ranking",
    rotulo: "Ranking",
    valor: (r) => r.ranking,
    celula: (r) => (r.ranking == null ? "—" : `${r.ranking}º`),
    numerica: true,
    formatoExcel: "0",
    larguraExcel: 8,
  },
  {
    id: "alertas",
    rotulo: "Alertas",
    valor: (r) => r.alertas.join(", ") || null,
    celula: (r) => (
      <div className="flex gap-1">
        {r.alertas.map((a) => (
          <EtiquetaAlerta key={a} alerta={a} />
        ))}
      </div>
    ),
    larguraExcel: 40,
  },
];

/** Compara valores para ordenação; vazios sempre no fim. */
export function compararValores(a: Valor, b: Valor, direcao: "asc" | "desc"): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const r =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "pt-BR", { numeric: true });
  return direcao === "asc" ? r : -r;
}
