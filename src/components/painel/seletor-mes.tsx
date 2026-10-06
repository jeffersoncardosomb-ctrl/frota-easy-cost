import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { chaveMes, formatMes, nomeMesAbrev, parseChaveMes, type ChaveMes } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  valor: ChaveMes;
  onChange: (valor: ChaveMes) => void;
  min?: ChaveMes;
  max?: ChaveMes;
  rotulo: string;
};

/** Seletor mês/ano: navegação por ano e grade com os 12 meses. */
export function SeletorMes({ valor, onChange, min, max, rotulo }: Props) {
  const [aberto, setAberto] = useState(false);
  const [ano, setAno] = useState(() => parseChaveMes(valor).ano);
  const selecionado = parseChaveMes(valor);

  const anoMin = min ? parseChaveMes(min).ano : -Infinity;
  const anoMax = max ? parseChaveMes(max).ano : Infinity;

  return (
    <Popover
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) setAno(selecionado.ano);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`${rotulo}: ${formatMes(valor)}`}
          className="h-9 w-[104px] justify-start gap-2 font-normal tabular-nums"
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {formatMes(valor)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="mb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setAno((a) => a - 1)}
            disabled={ano <= anoMin}
            aria-label="Ano anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums">{ano}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setAno((a) => a + 1)}
            disabled={ano >= anoMax}
            aria-label="Próximo ano"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
            const chave = chaveMes(ano, mes);
            const desabilitado = (min != null && chave < min) || (max != null && chave > max);
            const ativo = selecionado.ano === ano && selecionado.mes === mes;
            return (
              <Button
                key={mes}
                variant={ativo ? "default" : "ghost"}
                size="sm"
                disabled={desabilitado}
                className={cn("h-8", !ativo && "font-normal")}
                onClick={() => {
                  onChange(chave);
                  setAberto(false);
                }}
              >
                {nomeMesAbrev(mes)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
