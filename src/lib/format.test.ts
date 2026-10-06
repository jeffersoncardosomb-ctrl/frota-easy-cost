import { describe, expect, it } from "vitest";

import {
  formatMes,
  formatMoeda,
  formatMoedaCompacta,
  formatPercentual,
  formatVariacao,
  somarMeses,
} from "@/lib/format";
import {
  normalizarPatrimonio,
  resolverFiltros,
  rotuloPatrimonio,
  validarFiltrosSearch,
} from "@/lib/filtros";

describe("formatação pt-BR", () => {
  it("formata moeda sem centavos", () => {
    expect(formatMoeda(1234567)).toBe("R$ 1.234.567");
    expect(formatMoeda(0)).toBe("R$ 0");
  });

  it("abrevia valores grandes", () => {
    expect(formatMoedaCompacta(1_234_567)).toBe("R$ 1,2 mi");
    expect(formatMoedaCompacta(850_000)).toBe("R$ 850 mil");
    expect(formatMoedaCompacta(3_400_000_000)).toBe("R$ 3,4 bi");
    expect(formatMoedaCompacta(950)).toBe("R$ 950");
    expect(formatMoedaCompacta(-2_000_000)).toBe("-R$ 2 mi");
  });

  it("formata percentuais com 1 casa", () => {
    expect(formatPercentual(0.1234)).toBe("12,3%");
    expect(formatPercentual(0)).toBe("0,0%");
    expect(formatVariacao(0.05)).toBe("+5,0%");
    expect(formatVariacao(-0.021)).toBe("-2,1%");
  });

  it("formata meses como jan/26", () => {
    expect(formatMes("2026-01")).toBe("jan/26");
    expect(formatMes("2026-08")).toBe("ago/26");
  });

  it("soma meses atravessando o ano", () => {
    expect(somarMeses("2026-08", -11)).toBe("2025-09");
    expect(somarMeses("2025-12", 1)).toBe("2026-01");
  });
});

describe("filtros da URL", () => {
  it("descarta valores inválidos e aplica padrões", () => {
    const search = validarFiltrosSearch({ de: "2026-13", empresa: "xx", grupo: " Tratores " });
    expect(search).toEqual({ grupo: "Tratores" });
    expect(resolverFiltros(search, "2026-08")).toEqual({
      de: "2025-09",
      ate: "2026-08",
      empresa: "TODAS",
      grupo: "Tratores",
      patrimonio: null,
    });
  });

  it("aceita empresa em minúsculas e corrige período invertido", () => {
    const f = resolverFiltros(
      validarFiltrosSearch({ de: "2026-06", ate: "2026-02", empresa: "vc" }),
    );
    expect(f.de).toBe("2026-02");
    expect(f.ate).toBe("2026-06");
    expect(f.empresa).toBe("VC");
  });

  it("normaliza o número M do patrimônio", () => {
    expect(normalizarPatrimonio("M101")).toBe("101");
    expect(normalizarPatrimonio(" m 0101 ")).toBe("101");
    expect(normalizarPatrimonio("Trator JD")).toBe("Trator JD");
    expect(rotuloPatrimonio("101")).toBe("M101");
    expect(rotuloPatrimonio("Trator JD")).toBe("Trator JD");
  });
});
