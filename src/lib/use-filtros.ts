import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import {
  filtrosParaSearch,
  resolverFiltros,
  ULTIMO_MES_BASE,
  validarFiltrosSearch,
  type Filtros,
} from "@/lib/filtros";

/** Lê e altera os filtros das telas de análise. O estado vive na query string. */
export function useFiltros() {
  const search = useSearch({ from: "/_painel/_analise" });
  const navigate = useNavigate();
  const ultimoMes = ULTIMO_MES_BASE;

  // O router mescla a query bruta por baixo da validada: chaves inválidas
  // descartadas pelo validateSearch voltariam, então validamos de novo aqui.
  const filtros = useMemo(
    () => resolverFiltros(validarFiltrosSearch(search), ultimoMes),
    [search, ultimoMes],
  );

  const alterarFiltros = useCallback(
    (parcial: Partial<Filtros>) => {
      void navigate({
        to: ".",
        search: filtrosParaSearch(
          resolverFiltros(filtrosParaSearch({ ...filtros, ...parcial }), ultimoMes),
        ),
        replace: true,
      });
    },
    [filtros, navigate, ultimoMes],
  );

  const limparFiltros = useCallback(() => {
    void navigate({ to: ".", search: {}, replace: true });
  }, [navigate]);

  return { filtros, alterarFiltros, limparFiltros, ultimoMes };
}
