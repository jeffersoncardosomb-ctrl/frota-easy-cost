import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { rotuloPatrimonio } from "@/lib/filtros";
import { formatMes } from "@/lib/format";
import { useFiltros } from "@/lib/use-filtros";

export function CabecalhoPagina({
  titulo,
  descricao,
  icone: Icone,
}: {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icone className="size-5" />
      </span>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p>
      </div>
    </div>
  );
}

function EstadoVazio({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      {children}
    </div>
  );
}

/** Tela de análise ainda sem conteúdo: título + recorte atual dos filtros. */
export function PaginaAnaliseVazia(props: {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
}) {
  const { filtros } = useFiltros();
  const Icone = props.icone;

  return (
    <div className="space-y-6">
      <CabecalhoPagina {...props} />
      <EstadoVazio>
        <Icone className="size-8 text-muted-foreground/60" />
        <div>
          <p className="font-medium">Em construção</p>
          <p className="text-sm text-muted-foreground">
            Os indicadores desta tela aparecerão aqui.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          <Badge variant="secondary">
            {formatMes(filtros.de)} a {formatMes(filtros.ate)}
          </Badge>
          <Badge variant="secondary">
            {filtros.empresa === "TODAS" ? "Todas as empresas" : filtros.empresa}
          </Badge>
          {filtros.grupo && <Badge variant="secondary">Grupo: {filtros.grupo}</Badge>}
          {filtros.patrimonio && (
            <Badge variant="secondary">Patrimônio: {rotuloPatrimonio(filtros.patrimonio)}</Badge>
          )}
        </div>
      </EstadoVazio>
    </div>
  );
}

export function PaginaAdminVazia(props: { titulo: string; descricao: string; icone: LucideIcon }) {
  const Icone = props.icone;
  return (
    <div className="space-y-6">
      <CabecalhoPagina {...props} />
      <EstadoVazio>
        <Icone className="size-8 text-muted-foreground/60" />
        <div>
          <p className="font-medium">Em construção</p>
          <p className="text-sm text-muted-foreground">Disponível apenas para administradores.</p>
        </div>
      </EstadoVazio>
    </div>
  );
}
