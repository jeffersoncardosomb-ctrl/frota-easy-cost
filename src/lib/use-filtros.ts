import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import {
  filtrosParaSearch,
  resolverFiltros,
  ULTIMO_MES_BASE,
  validarFiltrosSearch,
  type Filtros,
} from "@/lib/filtros";

const CHAVES_BARRA = ["de", "ate", "empresa", "grupo", "patrimonio"];

function semFiltrosDaBarra(search: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(search).filter(([k]) => !CHAVES_BARRA.includes(k)));
}

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
      const novos = filtrosParaSearch(
        resolverFiltros(filtrosParaSearch({ ...filtros, ...parcial }), ultimoMes),
      );
      void navigate({
        to: ".",
        // mantém o que não é filtro da barra (ex.: ?alerta= da tela Ativos)
        search: (prev: Record<string, unknown>) => ({ ...semFiltrosDaBarra(prev), ...novos }),
        replace: true,
      });
    },
    [filtros, navigate, ultimoMes],
  );

  const limparFiltros = useCallback(() => {
    void navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => semFiltrosDaBarra(prev),
      replace: true,
    });
  }, [navigate]);

  return { filtros, alterarFiltros, limparFiltros, ultimoMes };
}
