import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { validarFiltrosSearch } from "@/lib/filtros";
import { formatVariacao } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Variação com seta. Em "custo", subir é ruim (vermelho) e cair é bom (verde);
 * em "bom" (ex.: km/L) é o contrário.
 */
export function Variacao({
  valor,
  rotulo,
  sentido = "custo",
  className,
}: {
  valor: number | null;
  rotulo?: string;
  sentido?: "custo" | "bom";
  className?: string;
}) {
  if (valor == null || !Number.isFinite(valor)) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        — {rotulo && <span>{rotulo}</span>}
      </span>
    );
  }
  const neutro = Math.abs(valor) < 0.0005;
  const piora = sentido === "custo" ? valor > 0 : valor < 0;
  const Icone = neutro ? ArrowRight : valor > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        neutro ? "text-muted-foreground" : piora ? "text-destructive" : "text-success",
        className,
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      <span className="sr-only">{neutro ? "estável" : piora ? "piora" : "melhora"}:</span>
      {formatVariacao(valor)}
      {rotulo && <span className="ml-1 font-normal text-muted-foreground">{rotulo}</span>}
    </span>
  );
}

/** Ícone (i) com a regra de cálculo. Fica acima do link que cobre o cartão. */
export function RegraCalculo({ regra }: { regra: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Como é calculado: ${regra}`}
          className="relative z-10 rounded-full p-0.5 text-muted-foreground/70 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-xs leading-snug">
        {regra}
      </TooltipContent>
    </Tooltip>
  );
}

export type Destino = { to: string; busca?: Record<string, string> };

/** Link que preserva os filtros da barra e acrescenta filtros extras do destino. */
export function LinkDestino({
  destino,
  className,
  children,
  ...rest
}: {
  destino: Destino;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Link
      to={destino.to}
      search={(prev: Record<string, unknown>) => ({
        ...validarFiltrosSearch(prev),
        ...destino.busca,
      })}
      className={className}
      {...rest}
    >
      {children}
    </Link>
  );
}

type Tamanho = "g" | "m" | "p";

/** Cartão clicável (todo o cartão leva ao destino) com regra de cálculo no (i). */
export function CartaoKpi({
  titulo,
  valor,
  valorCompleto,
  regra,
  destino,
  icone: Icone,
  marcador,
  tamanho = "m",
  children,
}: {
  titulo: string;
  valor: ReactNode;
  /** Valor sem abreviação, mostrado ao passar o mouse. */
  valorCompleto?: string;
  regra: string;
  destino: Destino;
  icone?: LucideIcon;
  /** Cor de identidade (ex.: a mesma da série no gráfico). */
  marcador?: string;
  tamanho?: Tamanho;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card text-card-foreground shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/30 focus-within:border-primary/50",
        tamanho === "g" ? "gap-2 p-5" : tamanho === "m" ? "gap-1.5 p-4" : "gap-1 px-4 py-3",
      )}
    >
      <div className="flex items-center gap-2">
        {marcador && (
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: marcador }}
            aria-hidden
          />
        )}
        {Icone && <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        <LinkDestino
          destino={destino}
          className="truncate text-sm font-medium text-muted-foreground outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-ring"
        >
          {titulo}
        </LinkDestino>
        <span className="ml-auto">
          <RegraCalculo regra={regra} />
        </span>
      </div>
      <div
        title={valorCompleto}
        className={cn(
          "font-semibold tracking-tight tabular-nums",
          tamanho === "g" ? "text-3xl" : tamanho === "m" ? "text-2xl" : "text-xl",
        )}
      >
        {valor}
      </div>
      {children && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}
