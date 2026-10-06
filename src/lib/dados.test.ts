import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { buscarTodasAsLinhas, normalizarMensalAtivo, TAMANHO_PAGINA } from "@/lib/dados";

/** Cliente falso que imita .from().select().order().range() sobre um array. */
function clienteFalso(total: number, limiteServidor = TAMANHO_PAGINA) {
  const chamadas: [number, number][] = [];
  const dados = Array.from({ length: total }, (_, i) => ({ id: i }));
  const consulta = {
    select: () => consulta,
    order: () => consulta,
    range: async (de: number, ate: number) => {
      chamadas.push([de, ate]);
      const fim = Math.min(ate + 1, de + limiteServidor);
      return { data: dados.slice(de, fim), error: null };
    },
  };
  const client = { from: () => consulta } as unknown as SupabaseClient;
  return { client, chamadas };
}

describe("buscarTodasAsLinhas", () => {
  it("pagina de 1000 em 1000 até trazer tudo", async () => {
    const { client, chamadas } = clienteFalso(2500);
    const linhas = await buscarTodasAsLinhas(client, "v", "*", ["id"]);
    expect(linhas).toHaveLength(2500);
    expect(linhas.at(-1)).toEqual({ id: 2499 });
    expect(chamadas).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [2500, 3499],
    ]);
  });

  it("não perde linhas se o servidor limitar a menos de 1000", async () => {
    const { client } = clienteFalso(1200, 500);
    expect(await buscarTodasAsLinhas(client, "v", "*", ["id"])).toHaveLength(1200);
  });

  it("propaga erro do Supabase", async () => {
    const consulta = {
      select: () => consulta,
      order: () => consulta,
      range: async () => ({ data: null, error: new Error("falhou") }),
    };
    const client = { from: () => consulta } as unknown as SupabaseClient;
    await expect(buscarTodasAsLinhas(client, "v", "*", [])).rejects.toThrow("falhou");
  });
});

describe("normalizarMensalAtivo", () => {
  it("converte mês e números vindos do banco", () => {
    const l = normalizarMensalAtivo({
      empresa: "VC",
      mes: "2026-08-01",
      m: 101,
      unidade: "km",
      custo_total: "1234.50",
      km_hr: null,
    });
    expect(l.mes).toBe("2026-08");
    expect(l.custo_total).toBe(1234.5);
    expect(l.km_hr).toBe(0);
    expect(l.unidade).toBe("km");
  });
});
