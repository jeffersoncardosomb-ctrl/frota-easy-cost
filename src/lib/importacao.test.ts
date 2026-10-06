import { describe, expect, it } from "vitest";

import {
  chaveCabecalho,
  converterBase,
  converterMes,
  converterNumero,
  converterTexto,
  emLotes,
  mapearCabecalho,
  montarPrevia,
} from "@/lib/importacao";

const CABECALHO = [
  "EMPRESA",
  "MÊS\nANO",
  "M",
  "PATRIMONIO",
  "SUBGRUPO",
  "SALÁRIO",
  "CUSTO\nCOMBUSTÍVEL",
  "DEPRECIAÇÃO",
  "KM RODADO\nHR",
  "QUANTIDADE  LITROS",
  "PRODUTO",
  "QTDE",
  "VALOR TOTAL",
  "DESPESA",
  "DESPESAPAI",
  "CONTA",
  "MOTORISTA",
  "FAZ.",
  "CATEGORIA", // coluna de fórmula: ignorada
];

const linha = (p: Partial<Record<string, unknown>>) =>
  CABECALHO.map((c) => p[c.replace(/\s+/g, " ")] ?? null);

describe("cabeçalho", () => {
  it("ignora quebras de linha, espaços, acentos e pontuação", () => {
    expect(chaveCabecalho("MÊS\nANO")).toBe("MESANO");
    expect(chaveCabecalho(" faz. ")).toBe("FAZ");
    const m = mapearCabecalho(CABECALHO);
    expect(m.mes).toBe(1);
    expect(m.custo_combustivel).toBe(6);
    expect(m.km_hr).toBe(8);
    expect(m.litros).toBe(9);
    expect(m.fazenda).toBe(17);
    expect(Object.values(m)).not.toContain(18);
  });
});

describe("conversões", () => {
  it("mês: data, serial do Excel e textos comuns → primeiro dia", () => {
    expect(converterMes(new Date(Date.UTC(2026, 7, 15)))).toBe("2026-08-01");
    expect(converterMes(46235)).toBe("2026-08-01"); // 2026-08-01 no Excel
    expect(converterMes("ago/26")).toBe("2026-08-01");
    expect(converterMes("AGOSTO/2026")).toBe("2026-08-01");
    expect(converterMes("08/2026")).toBe("2026-08-01");
    expect(converterMes("15/08/2026")).toBe("2026-08-01");
    expect(converterMes("2026-08-01")).toBe("2026-08-01");
    expect(converterMes("março de 2026")).toBe("2026-03-01");
    expect(converterMes("xyz")).toBeNull();
    expect(converterMes(null)).toBeNull();
  });

  it("número: pt-BR, vazio e inválido", () => {
    expect(converterNumero(12.5)).toBe(12.5);
    expect(converterNumero("1.234,56")).toBe(1234.56);
    expect(converterNumero("R$ 10,00")).toBe(10);
    expect(converterNumero("")).toBe(0);
    expect(converterNumero(null)).toBe(0);
    expect(converterNumero("abc")).toBeNull();
  });

  it("texto: XXX e vazio viram null", () => {
    expect(converterTexto(" XXX ")).toBeNull();
    expect(converterTexto("  ")).toBeNull();
    expect(converterTexto(" Pneu ")).toBe("Pneu");
  });
});

describe("converterBase", () => {
  const dados = [
    ["Planilha de custos"], // título acima do cabeçalho
    CABECALHO,
    linha({
      EMPRESA: "vc",
      "MÊS ANO": "ago/26",
      M: 101,
      PATRIMONIO: "Trator 1",
      SUBGRUPO: "TRATOR",
      PRODUTO: "DIESEL",
      "VALOR TOTAL": 500,
      "CUSTO COMBUSTÍVEL": 500,
      "QUANTIDADE LITROS": 80,
      MOTORISTA: "XXX",
    }),
    linha({ EMPRESA: "VC", "MÊS ANO": "ago/26", M: 102, PRODUTO: "XXX" }), // placeholder
    linha({ EMPRESA: "VC", "MÊS ANO": "ago/26", M: 103, PRODUTO: "XXX", "VALOR TOTAL": 10 }), // XXX com valor: fica
    [], // vazia
    linha({ EMPRESA: "VC", "MÊS ANO": "13/2026", M: 104, "VALOR TOTAL": 1 }),
    linha({ EMPRESA: "VC", "MÊS ANO": "ago/26", M: "abc", "VALOR TOTAL": 1 }),
    linha({ EMPRESA: "VC", "MÊS ANO": "ago/26", M: 105, "VALOR TOTAL": "um" }),
  ];

  it("converte, descarta placeholders e aponta erros por linha do Excel", () => {
    const r = converterBase(dados);
    expect(r.lancamentos).toHaveLength(2);
    const [a, b] = r.lancamentos;
    expect(a).toMatchObject({
      empresa: "VC",
      mes: "2026-08-01",
      m: 101,
      valor_total: 500,
      litros: 80,
      motorista: null,
      qtde: 0,
    });
    expect(b).toMatchObject({ m: 103, produto: null, valor_total: 10 });
    expect(r.placeholders).toBe(1);
    expect(r.vazias).toBe(1);
    expect(r.erros.map((e) => e.linha)).toEqual([7, 8, 9]);
    expect(r.erros[0]!.motivo).toContain("MÊS ANO");
    expect(r.colunasAusentes).toEqual([]);
  });

  it("falha sem as colunas obrigatórias", () => {
    expect(() =>
      converterBase([
        ["EMPRESA", "M"],
        ["VC", 1],
      ]),
    ).toThrow(/Cabeçalho não encontrado/);
  });
});

describe("prévia", () => {
  const base = {
    patrimonio: null,
    subgrupo: null,
    salario: 0,
    custo_combustivel: 0,
    depreciacao: 0,
    km_hr: 0,
    litros: 0,
    produto: null,
    qtde: 0,
    despesa: null,
    despesa_pai: null,
    conta: null,
    motorista: null,
    fazenda: null,
  };
  it("agrupa por mês e empresa e acha subgrupos e M novos", () => {
    const p = montarPrevia(
      [
        { ...base, empresa: "VC", mes: "2026-08-01", m: 1, subgrupo: "TRATOR", valor_total: 100 },
        {
          ...base,
          empresa: "OL",
          mes: "2026-08-01",
          m: 2,
          subgrupo: "Drone",
          patrimonio: "Drone A",
          valor_total: 50,
        },
        {
          ...base,
          empresa: "OL",
          mes: "2026-08-01",
          m: 2,
          subgrupo: "Drone",
          patrimonio: "Drone A",
          valor_total: 5,
        },
        { ...base, empresa: "VC", mes: "2026-07-01", m: 1, subgrupo: "trator", valor_total: 10 },
      ],
      ["TRATOR"],
      [1],
    );
    expect(p.meses).toEqual(["2026-07-01", "2026-08-01"]);
    expect(p.grupos.map((g) => `${g.mes} ${g.empresa} ${g.linhas} ${g.valorTotal}`)).toEqual([
      "2026-07-01 VC 1 10",
      "2026-08-01 OL 2 55",
      "2026-08-01 VC 1 100",
    ]);
    expect(p.totalPorMes.at(-1)).toEqual({ mes: "2026-08-01", linhas: 3, valorTotal: 155 });
    expect(p.subgruposNovos).toEqual([{ subgrupo: "Drone", linhas: 2, valorTotal: 55 }]);
    expect(p.ativosNovos).toEqual([{ m: 2, patrimonio: "Drone A", subgrupo: "Drone", linhas: 2 }]);
  });

  it("divide em lotes de 1000", () => {
    expect(emLotes(Array.from({ length: 2500 }), 1000).map((l) => l.length)).toEqual([
      1000, 1000, 500,
    ]);
  });
});
