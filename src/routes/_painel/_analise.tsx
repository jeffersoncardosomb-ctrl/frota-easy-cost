import { createFileRoute, Outlet } from "@tanstack/react-router";

import { BarraFiltros } from "@/components/painel/barra-filtros";
import { validarFiltrosSearch } from "@/lib/filtros";

// Layout das telas de análise: filtros na query string + barra fixa no topo.
export const Route = createFileRoute("/_painel/_analise")({
  validateSearch: validarFiltrosSearch,
  component: LayoutAnalise,
});

function LayoutAnalise() {
  return (
    <>
      <BarraFiltros />
      <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        <Outlet />
      </div>
    </>
  );
}
