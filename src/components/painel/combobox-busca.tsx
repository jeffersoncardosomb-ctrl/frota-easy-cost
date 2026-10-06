import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type OpcaoCombobox = { valor: string; rotulo: string; detalhe?: string };

type Props = {
  icone: ReactNode;
  placeholder: string;
  placeholderBusca: string;
  valor: string | null;
  rotuloValor?: string | null;
  opcoes: OpcaoCombobox[];
  carregando?: boolean;
  vazio: string;
  onChange: (valor: string | null) => void;
  /** Quando informado, a busca é feita fora (no servidor) e o cmdk não filtra. */
  onBuscaChange?: (termo: string) => void;
  /** Permite usar o texto digitado como valor, mesmo sem correspondência na lista. */
  permitirLivre?: boolean;
  className?: string;
};

export function ComboboxBusca({
  icone,
  placeholder,
  placeholderBusca,
  valor,
  rotuloValor,
  opcoes,
  carregando,
  vazio,
  onChange,
  onBuscaChange,
  permitirLivre,
  className,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");

  const selecionar = (v: string | null) => {
    onChange(v);
    setAberto(false);
    setTermo("");
    onBuscaChange?.("");
  };

  const termoLimpo = termo.trim();
  const mostrarLivre =
    permitirLivre &&
    termoLimpo !== "" &&
    !opcoes.some((o) => o.valor.toLowerCase() === termoLimpo.toLowerCase());

  return (
    <div className={cn("relative", className)}>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={aberto}
            className={cn(
              "h-9 w-full justify-start gap-2 font-normal",
              valor && "border-primary/40 bg-primary/5 pr-8",
            )}
          >
            <span className="text-muted-foreground">{icone}</span>
            <span className={cn("truncate", !valor && "text-muted-foreground")}>
              {valor ? (rotuloValor ?? valor) : placeholder}
            </span>
            {!valor && <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-64 p-0" align="start">
          <Command shouldFilter={!onBuscaChange}>
            <CommandInput
              placeholder={placeholderBusca}
              value={termo}
              onValueChange={(t) => {
                setTermo(t);
                onBuscaChange?.(t);
              }}
            />
            <CommandList>
              {carregando ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Carregando…</div>
              ) : (
                <CommandEmpty>{vazio}</CommandEmpty>
              )}
              {opcoes.length > 0 && (
                <CommandGroup>
                  {opcoes.map((o) => (
                    <CommandItem
                      key={o.valor}
                      value={`${o.valor} ${o.rotulo}`}
                      onSelect={() => selecionar(o.valor === valor ? null : o.valor)}
                    >
                      <Check
                        className={cn("size-4", o.valor === valor ? "opacity-100" : "opacity-0")}
                      />
                      <span className="truncate">{o.rotulo}</span>
                      {o.detalhe && (
                        <span className="ml-auto truncate text-xs text-muted-foreground">
                          {o.detalhe}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {mostrarLivre && (
                <CommandGroup>
                  <CommandItem
                    value={`__livre__${termoLimpo}`}
                    onSelect={() => selecionar(termoLimpo)}
                  >
                    Filtrar por “{termoLimpo}”
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {valor && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Limpar ${placeholder.toLowerCase()}`}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
