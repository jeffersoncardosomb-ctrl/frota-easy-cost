import { createFileRoute, Outlet } from "@tanstack/react-router";

import { BarraFiltros } from "@/components/painel/barra-filtros";
import { FichaAtivo } from "@/components/ativos/ficha-ativo";
import { validarFiltrosSearch } from "@/lib/filtros";
import { validarAtivoAberto } from "@/lib/use-ativo-aberto";

// Layout das telas de análise: filtros na query string + barra fixa no topo.
export const Route = createFileRoute("/_painel/_analise")({
  // filtros da barra + ?ativo=M (ficha lateral aberta em qualquer tela de análise)
  validateSearch: (search: Record<string, unknown>) => ({
    ...validarFiltrosSearch(search),
    ...validarAtivoAberto(search),
  }),
  component: LayoutAnalise,
});

function LayoutAnalise() {
  return (
    <>
      <BarraFiltros />
      <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        <Outlet />
      </div>
      <FichaAtivo />
    </>
  );
}
