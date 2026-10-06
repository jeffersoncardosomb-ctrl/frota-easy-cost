import { ALERTAS, type Alerta } from "@/lib/metricas";
import { cn } from "@/lib/utils";

/** Cor de cada tipo de alerta; o texto sempre acompanha (nunca só a cor). */
const CORES: Record<Alerta, string> = {
  [ALERTAS.SEM_USO_COM_CUSTO]:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-200",
  [ALERTAS.ABASTECEU_SEM_KM_H]:
    "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-500/50 dark:bg-violet-950/40 dark:text-violet-200",
  [ALERTAS.CONSUMO_FORA_PADRAO]:
    "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-500/50 dark:bg-orange-950/40 dark:text-orange-200",
  [ALERTAS.MANUTENCAO_ATIPICA]:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200",
};

export function EtiquetaAlerta({ alerta, className }: { alerta: Alerta; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        CORES[alerta],
        className,
      )}
    >
      {alerta}
    </span>
  );
}
