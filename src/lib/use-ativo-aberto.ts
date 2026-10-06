import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

/** Valida ?ativo=M (número do patrimônio da ficha aberta). */
export function validarAtivoAberto(search: Record<string, unknown>): { ativo?: number } {
  const v = Number(search["ativo"]);
  return Number.isInteger(v) && v > 0 ? { ativo: v } : {};
}

/** Ficha lateral do ativo: o M aberto fica na URL, então o link copiado reabre a ficha. */
export function useAtivoAberto() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const m = validarAtivoAberto(search).ativo ?? null;

  const abrir = useCallback(
    (ativo: number) =>
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({ ...prev, ativo }),
      }),
    [navigate],
  );

  const fechar = useCallback(
    () =>
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) =>
          Object.fromEntries(Object.entries(prev).filter(([k]) => k !== "ativo")),
      }),
    [navigate],
  );

  return { m, abrir, fechar };
}
