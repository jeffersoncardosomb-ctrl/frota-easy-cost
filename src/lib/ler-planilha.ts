// Único ponto que conhece a biblioteca de leitura de .xlsx: para trocar por
// outra (ex.: SheetJS), basta reimplementar lerAba().

/** Lê uma aba do .xlsx como linhas de células (número, texto, Date, boolean ou null). */
export async function lerAba(arquivo: File, nomeAba: string): Promise<unknown[][]> {
  // carregada só quando o admin solta um arquivo
  const { readSheet, default: readXlsxFile } = await import("read-excel-file/browser");
  try {
    return (await readSheet(arquivo, nomeAba)) as unknown[][];
  } catch (e) {
    // nome da aba com maiúsculas/espaços diferentes: procura ignorando isso
    if (e instanceof Error && e.name === "SheetNotFoundError") {
      const abas = await readXlsxFile(arquivo);
      const alvo = abas.find((a) => a.sheet.trim().toUpperCase() === nomeAba.toUpperCase());
      if (alvo) return alvo.data as unknown[][];
      throw new Error(
        `A planilha não tem a aba “${nomeAba}”. Abas encontradas: ${abas.map((a) => a.sheet).join(", ")}.`,
      );
    }
    throw e;
  }
}
