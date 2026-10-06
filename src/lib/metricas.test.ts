import { describe, expect, it } from "vitest";

import {
  ALERTAS,
  eficienciaPorSubgrupo,
  filtrarLinhas,
  filtroDaUrl,
  janela12m,
  janela12mAnterior,
  lerParametros,
  mesesNoPeriodo,
  mesmoPeriodoAnoAnterior,
  PARAMETROS_PADRAO,
  periodoAnterior,
  rateioSemirreboques,
  resumoPeriodo,
  serieMensal,
  somarTotais,
  tabelaAtivos,
  type FiltroMetricas,
  type LinhaMensalAtivo,
} from "@/lib/metricas";

function linha(p: Partial<LinhaMensalAtivo>): LinhaMensalAtivo {
  return {
    empresa: "VC",
    mes: "2026-08",
    m: 1,
    patrimonio: "Ativo",
    subgrupo: "TRATOR",
    grupo: "TRATOR",
    categoria: "MÁQUINAS",
    subcategoria: "Máquinas",
    unidade: "h",
    combustivel: 0,
    manutencao: 0,
    salario: 0,
    depreciacao: 0,
    custo_total: 0,
    km_hr: 0,
    litros: 0,
    ...p,
  };
}

const filtro = (p: Partial<FiltroMetricas> = {}): FiltroMetricas => ({
  mesIni: "2026-08",
  mesFim: "2026-08",
  empresa: "TODAS",
  grupo: null,
  m: null,
  ...p,
});

describe("períodos", () => {
  const p = { ini: "2026-06", fim: "2026-08" };

  it("conta meses e calcula período anterior com o mesmo tamanho", () => {
    expect(mesesNoPeriodo(p)).toBe(3);
    expect(periodoAnterior(p)).toEqual({ ini: "2026-03", fim: "2026-05" });
    expect(periodoAnterior({ ini: "2026-01", fim: "2026-01" })).toEqual({
      ini: "2025-12",
      fim: "2025-12",
    });
  });

  it("calcula mesmo período do ano anterior e janelas 12m", () => {
    expect(mesmoPeriodoAnoAnterior(p)).toEqual({ ini: "2025-06", fim: "2025-08" });
    expect(janela12m("2026-08")).toEqual({ ini: "2025-09", fim: "2026-08" });
    expect(janela12mAnterior("2026-08")).toEqual({ ini: "2024-09", fim: "2025-08" });
  });
});

describe("filtros", () => {
  const linhas = [
    linha({ empresa: "VC", grupo: "Tratores", m: 1 }),
    linha({ empresa: "OL", grupo: "TRATORES", m: 2 }),
    linha({ empresa: "VC", grupo: "Colhedoras", m: 3 }),
    linha({ empresa: "VC", grupo: "Tratores", m: 4, mes: "2026-07" }),
  ];

  it("TODAS/TODOS não filtram e o período é respeitado", () => {
    expect(filtrarLinhas(linhas, filtro({ grupo: "TODOS" })).map((l) => l.m)).toEqual([1, 2, 3]);
  });

  it("filtra empresa, grupo sem diferenciar maiúsculas e M", () => {
    expect(filtrarLinhas(linhas, filtro({ empresa: "VC" })).map((l) => l.m)).toEqual([1, 3]);
    expect(filtrarLinhas(linhas, filtro({ grupo: "tratores" })).map((l) => l.m)).toEqual([1, 2]);
    expect(filtrarLinhas(linhas, filtro({ m: 3 })).map((l) => l.m)).toEqual([3]);
  });

  it("converte os filtros da URL", () => {
    expect(
      filtroDaUrl({ de: "2026-01", ate: "2026-08", empresa: "VC", grupo: null, patrimonio: "101" }),
    ).toEqual({ mesIni: "2026-01", mesFim: "2026-08", empresa: "VC", grupo: null, m: 101 });
    expect(
      filtroDaUrl({ de: "2026-01", ate: "2026-08", empresa: "VC", grupo: null, patrimonio: "x" }).m,
    ).toBeNull();
  });
});

describe("totais", () => {
  it("soma componentes, percentuais e R$/litro", () => {
    const t = somarTotais([
      linha({
        combustivel: 600,
        manutencao: 200,
        salario: 100,
        depreciacao: 100,
        custo_total: 1000,
        litros: 100,
      }),
      linha({ combustivel: 0, manutencao: 1000, custo_total: 1000 }),
    ]);
    expect(t.custo_total).toBe(2000);
    expect(t.pct.combustivel).toBeCloseTo(0.3);
    expect(t.pct.manutencao).toBeCloseTo(0.6);
    expect(t.reaisPorLitro).toBe(6);
  });

  it("evita divisão por zero", () => {
    const t = somarTotais([]);
    expect(t.pct.combustivel).toBeNull();
    expect(t.reaisPorLitro).toBeNull();
  });

  it("resumo traz atual, anterior, ano anterior e janelas 12m", () => {
    const linhas = [
      linha({ mes: "2026-08", custo_total: 100 }),
      linha({ mes: "2026-07", custo_total: 50 }),
      linha({ mes: "2025-08", custo_total: 30 }),
      linha({ mes: "2025-01", custo_total: 7 }),
    ];
    const r = resumoPeriodo(linhas, filtro());
    expect(r.atual.custo_total).toBe(100);
    expect(r.anterior.custo_total).toBe(50);
    expect(r.anoAnterior.custo_total).toBe(30);
    expect(r.ultimos12m.custo_total).toBe(150);
    expect(r.anteriores12m.custo_total).toBe(37);
  });
});

describe("eficiência por subgrupo", () => {
  it("km → km/l e R$/km; h → l/h e R$/h; '-' sem consumo; nunca soma km com horas", () => {
    const r = eficienciaPorSubgrupo(
      [
        linha({
          m: 1,
          subgrupo: "CAMINHÃO",
          unidade: "km",
          km_hr: 1000,
          litros: 400,
          custo_total: 5000,
        }),
        linha({
          m: 2,
          subgrupo: "caminhão",
          unidade: "km",
          km_hr: 1000,
          litros: 100,
          custo_total: 3000,
        }),
        linha({
          m: 3,
          subgrupo: "TRATOR",
          unidade: "h",
          km_hr: 100,
          litros: 1500,
          custo_total: 2000,
        }),
        linha({ m: 4, subgrupo: "GRADE", unidade: "-", km_hr: 0, litros: 0, custo_total: 500 }),
      ],
      filtro(),
    );
    const caminhao = r.find((e) => e.subgrupo === "CAMINHÃO")!;
    expect(caminhao.ativos).toBe(2);
    expect(caminhao.consumo).toBe(4); // 2000 km / 500 l
    expect(caminhao.custoPorUnidade).toBe(4); // 8000 / 2000 km
    const trator = r.find((e) => e.subgrupo === "TRATOR")!;
    expect(trator.km_hr).toBe(100);
    expect(trator.consumo).toBe(15); // 1500 l / 100 h
    expect(trator.custoPorUnidade).toBe(20);
    const grade = r.find((e) => e.subgrupo === "GRADE")!;
    expect(grade.consumo).toBeNull();
    expect(grade.custoPorUnidade).toBeNull();
  });
});

describe("série mensal", () => {
  it("calcula variações e média móvel 12m", () => {
    const linhas = [
      linha({ mes: "2025-08", custo_total: 100 }),
      linha({ mes: "2026-07", custo_total: 200 }),
      linha({ mes: "2026-08", custo_total: 300 }),
    ];
    const s = serieMensal(linhas, filtro({ mesIni: "2026-07", mesFim: "2026-08" }));
    expect(s.map((p) => p.mes)).toEqual(["2026-07", "2026-08"]);
    const ago = s[1]!;
    expect(ago.varMesAnterior).toBeCloseTo(0.5);
    expect(ago.varAnoAnterior).toBeCloseTo(2);
    // janela set/25..ago/26: 12 meses, todos depois do 1º mês da base
    expect(ago.mediaMovel12m).toBeCloseTo(500 / 12);
    // jul/26: sem custo em jun/26 → sem variação
    expect(s[0]!.varMesAnterior).toBeNull();
  });

  it("média móvel não conta meses anteriores ao início da base", () => {
    const s = serieMensal(
      [linha({ mes: "2026-07", custo_total: 200 }), linha({ mes: "2026-08", custo_total: 400 })],
      filtro(),
    );
    expect(s[0]!.mediaMovel12m).toBe(300);
  });
});

describe("tabela de ativos e alertas", () => {
  const p = PARAMETROS_PADRAO;

  it("SEM USO C/ CUSTO e ABASTECEU SEM KM/H", () => {
    const t = tabelaAtivos(
      [
        linha({ m: 1, unidade: "h", custo_total: 100 }),
        linha({ m: 2, unidade: "-", custo_total: 100 }),
        linha({
          m: 3,
          unidade: "km",
          subgrupo: "PICKUP",
          litros: 40,
          combustivel: 240,
          custo_total: 240,
        }),
      ],
      filtro(),
      p,
    );
    const de = (m: number) => t.find((a) => a.m === m)!.alertas;
    expect(de(1)).toEqual([ALERTAS.SEM_USO_COM_CUSTO]);
    expect(de(2)).toEqual([]);
    expect(de(3)).toEqual([ALERTAS.ABASTECEU_SEM_KM_H]);
  });

  it("CONSUMO FORA DO PADRÃO compara com o subgrupo nos 12m", () => {
    const linhas = [
      // subgrupo PICKUP: 9000 km / 1000 l nos 12m = 9 km/l
      linha({ m: 10, unidade: "km", subgrupo: "PICKUP", mes: "2026-01", km_hr: 8000, litros: 800 }),
      linha({ m: 11, unidade: "km", subgrupo: "PICKUP", km_hr: 500, litros: 100 }), // 5 km/l → -44%
      linha({ m: 12, unidade: "km", subgrupo: "PICKUP", km_hr: 500, litros: 100 / 1 }),
      // TRATOR: 100 h / 1000 l nos 12m = 10 l/h
      linha({ m: 20, unidade: "h", mes: "2026-01", km_hr: 90, litros: 700 }),
      linha({ m: 21, unidade: "h", km_hr: 10, litros: 300 }), // 30 l/h → +200%
      linha({ m: 22, unidade: "h", km_hr: 10, litros: 30 }), // abaixo do mínimo de litros
    ];
    const t = tabelaAtivos(linhas, filtro(), p);
    const de = (m: number) => t.find((a) => a.m === m)!;
    expect(de(11).consumoRef12m).toBeCloseTo(9000 / 1000);
    expect(de(11).alertas).toContain(ALERTAS.CONSUMO_FORA_PADRAO);
    expect(de(21).desvioConsumo).toBeCloseTo(30 / (1030 / 110) - 1);
    expect(de(21).alertas).toContain(ALERTAS.CONSUMO_FORA_PADRAO);
    expect(de(22).alertas).not.toContain(ALERTAS.CONSUMO_FORA_PADRAO);
  });

  it("km com consumo melhor que o subgrupo não gera alerta", () => {
    const t = tabelaAtivos(
      [
        linha({ m: 1, unidade: "km", subgrupo: "PICKUP", km_hr: 1000, litros: 200 }),
        linha({ m: 2, unidade: "km", subgrupo: "PICKUP", km_hr: 1500, litros: 100 }),
      ],
      filtro(),
      p,
    );
    expect(t.find((a) => a.m === 2)!.alertas).toEqual([]);
    expect(t.find((a) => a.m === 1)!.alertas).toEqual([ALERTAS.CONSUMO_FORA_PADRAO]);
  });

  it("MANUTENÇÃO ATÍPICA usa mínimo e múltiplo da média mensal 12m", () => {
    const linhas = [
      linha({ m: 1, mes: "2026-01", manutencao: 6000, custo_total: 6000, km_hr: 10, litros: 10 }),
      linha({ m: 1, manutencao: 6000, custo_total: 6000, km_hr: 10, litros: 10 }),
      // 4000 no período: abaixo do mínimo de 5000
      linha({ m: 2, manutencao: 4000, custo_total: 4000, km_hr: 10, litros: 10 }),
    ];
    const t = tabelaAtivos(linhas, filtro(), p);
    // m1: 6000 > 3 x (12000/12 = 1000)
    expect(t.find((a) => a.m === 1)!.alertas).toContain(ALERTAS.MANUTENCAO_ATIPICA);
    expect(t.find((a) => a.m === 2)!.alertas).not.toContain(ALERTAS.MANUTENCAO_ATIPICA);
  });

  it("lê parâmetros do banco com padrões e vírgula decimal", () => {
    expect(lerParametros({ alerta_consumo_desvio: "0,3", alerta_manut_min: "abc" })).toEqual({
      ...PARAMETROS_PADRAO,
      alerta_consumo_desvio: 0.3,
    });
  });
});

describe("rateio de semirreboques", () => {
  it("divide o custo dos reboques pelo km dos cavalos, respeitando empresa", () => {
    const linhas = [
      linha({ m: 900, subgrupo: "SEMIRREBOQUE", unidade: "-", custo_total: 3000 }),
      linha({ m: 901, subgrupo: "SEMIRREBOQUE", unidade: "-", custo_total: 1000, empresa: "OL" }),
      linha({ m: 1, subgrupo: "Cavalo Mecânico", unidade: "km", km_hr: 2000 }),
      linha({ m: 2, subgrupo: "CAVALO MECÂNICO", unidade: "km", km_hr: 1000 }),
      linha({ m: 3, subgrupo: "CAVALO MECÂNICO", unidade: "km", km_hr: 5000, empresa: "OL" }),
      linha({ m: 2, subgrupo: "CAVALO MECÂNICO", unidade: "km", km_hr: 999, mes: "2026-07" }),
    ];
    const r = rateioSemirreboques(linhas, filtro({ empresa: "VC" }), [900, 901], PARAMETROS_PADRAO);
    expect(r.custoReboques).toBe(3000);
    expect(r.kmCavalos).toBe(3000);
    expect(r.reaisPorKm).toBe(1);
    expect(r.porCavalo).toEqual([
      { m: 1, patrimonio: "Ativo", km: 2000, custo_reboque: 2000 },
      { m: 2, patrimonio: "Ativo", km: 1000, custo_reboque: 1000 },
    ]);
  });

  it("sem km dos cavalos não rateia", () => {
    const r = rateioSemirreboques(
      [linha({ m: 900, custo_total: 500 })],
      filtro(),
      [900],
      PARAMETROS_PADRAO,
    );
    expect(r.reaisPorKm).toBeNull();
    expect(r.porCavalo).toEqual([]);
  });
});
