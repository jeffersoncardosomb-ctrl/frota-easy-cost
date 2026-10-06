/** Uma coluna da planilha exportada. */
export type ColunaExcel<T> = {
  rotulo: string;
  valor: (linha: T) => number | string | null;
  formato?: string;
  largura?: number;
};

/**
 * Gera e baixa um .xlsx. A biblioteca só é carregada no clique, para não pesar
 * no carregamento do painel.
 */
export async function exportarExcel<T>(
  linhas: readonly T[],
  colunas: readonly ColunaExcel<T>[],
  nomeArquivo: string,
  nomeAba = "Dados",
): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const cabecalho = colunas.map((c) => ({ value: c.rotulo, fontWeight: "bold" as const }));
  const corpo = linhas.map((l) =>
    colunas.map((c) => {
      const v = c.valor(l);
      if (v == null) return null;
      return typeof v === "number"
        ? { value: v, type: Number, ...(c.formato ? { format: c.formato } : {}) }
        : { value: v, type: String };
    }),
  );
  await writeXlsxFile([cabecalho, ...corpo], {
    sheet: nomeAba,
    columns: colunas.map((c) => ({ width: c.largura ?? 14 })),
    stickyRowsCount: 1,
  }).toFile(nomeArquivo);
}
