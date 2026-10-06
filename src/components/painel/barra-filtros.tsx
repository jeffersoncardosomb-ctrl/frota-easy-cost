import { useQuery } from "@tanstack/react-query";
import { Database, FilterX, Layers, Tractor } from "lucide-react";
import { useEffect, useState } from "react";

import { ComboboxBusca, type OpcaoCombobox } from "@/components/painel/combobox-busca";
import { SeletorMes } from "@/components/painel/seletor-mes";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { EMPRESAS, normalizarPatrimonio, rotuloPatrimonio, type Empresa } from "@/lib/filtros";
import { formatMes } from "@/lib/format";
import { useFiltros } from "@/lib/use-filtros";

type AtivoCadastro = {
  m: number;
  patrimonio: string | null;
  subgrupo: string | null;
  grupo_override: string | null;
};

/** Grupo do ativo, como na view v_lancamentos: "Grupo (edite aqui)" ou, vazio, o subgrupo. */
function grupoDoAtivo(a: Pick<AtivoCadastro, "subgrupo" | "grupo_override">): string | null {
  return a.grupo_override?.trim() || a.subgrupo || null;
}

function useGrupos() {
  return useQuery({
    queryKey: ["grupos"],
    enabled: supabase != null,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<OpcaoCombobox[]> => {
      const { data, error } = await supabase!.from("ativos").select("subgrupo, grupo_override");
      if (error) throw error;
      const grupos = new Set<string>();
      for (const a of (data ?? []) as AtivoCadastro[]) {
        const g = grupoDoAtivo(a);
        if (g) grupos.add(g);
      }
      return [...grupos]
        .sort((x, y) => x.localeCompare(y, "pt-BR"))
        .map((g) => ({ valor: g, rotulo: g }));
    },
  });
}

function useDebounce<T>(valor: T, ms: number): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

function useBuscaPatrimonio(termo: string) {
  // Remove caracteres que quebram a sintaxe do filtro .or() do PostgREST.
  const t = useDebounce(normalizarPatrimonio(termo.replace(/[,()*%\\]/g, " ")), 250);
  return useQuery({
    queryKey: ["ativos-busca", t],
    enabled: supabase != null,
    staleTime: 60_000,
    queryFn: async (): Promise<OpcaoCombobox[]> => {
      let q = supabase!.from("ativos").select("m, patrimonio").order("m").limit(30);
      if (/^\d+$/.test(t)) q = q.or(`m.eq.${t},patrimonio.ilike.%${t}%`);
      else if (t) q = q.ilike("patrimonio", `%${t}%`);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as Pick<AtivoCadastro, "m" | "patrimonio">[]).map((a) => ({
        valor: String(a.m),
        rotulo: `M${a.m}`,
        ...(a.patrimonio ? { detalhe: a.patrimonio } : {}),
      }));
    },
  });
}

export function BarraFiltros() {
  const { filtros, alterarFiltros, limparFiltros, ultimoMes } = useFiltros();
  const [termoPatrimonio, setTermoPatrimonio] = useState("");
  const grupos = useGrupos();
  const ativos = useBuscaPatrimonio(termoPatrimonio);

  const temFiltroExtra = filtros.empresa !== "TODAS" || filtros.grupo || filtros.patrimonio;

  return (
    <div className="sticky top-14 z-20 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Período</span>
          <SeletorMes
            rotulo="Mês inicial"
            valor={filtros.de}
            max={filtros.ate}
            onChange={(de) => alterarFiltros({ de })}
          />
          <span className="text-xs text-muted-foreground">a</span>
          <SeletorMes
            rotulo="Mês final"
            valor={filtros.ate}
            min={filtros.de}
            max={ultimoMes}
            onChange={(ate) => alterarFiltros({ ate })}
          />
        </div>

        <Select
          value={filtros.empresa}
          onValueChange={(v) => alterarFiltros({ empresa: v as Empresa })}
        >
          <SelectTrigger
            aria-label="Empresa"
            className={`h-9 w-[136px] ${filtros.empresa !== "TODAS" ? "border-primary/40 bg-primary/5" : ""}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMPRESAS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ComboboxBusca
          className="w-[172px]"
          icone={<Layers className="size-4" />}
          placeholder="Grupo"
          placeholderBusca="Buscar grupo…"
          valor={filtros.grupo}
          opcoes={grupos.data ?? []}
          carregando={grupos.isLoading}
          vazio={grupos.isError ? "Erro ao carregar grupos." : "Nenhum grupo encontrado."}
          onChange={(grupo) => alterarFiltros({ grupo })}
        />

        <ComboboxBusca
          className="w-[192px]"
          icone={<Tractor className="size-4" />}
          placeholder="Patrimônio"
          placeholderBusca="Número M ou nome…"
          valor={filtros.patrimonio}
          rotuloValor={filtros.patrimonio ? rotuloPatrimonio(filtros.patrimonio) : null}
          opcoes={ativos.data ?? []}
          carregando={ativos.isFetching && !ativos.data}
          vazio={ativos.isError ? "Erro na busca." : "Nenhum patrimônio encontrado."}
          onBuscaChange={setTermoPatrimonio}
          permitirLivre
          onChange={(p) => alterarFiltros({ patrimonio: p ? normalizarPatrimonio(p) : null })}
        />

        {temFiltroExtra && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-muted-foreground"
            onClick={limparFiltros}
          >
            <FilterX className="size-4" />
            Limpar
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Database className="size-3.5" />
          Último mês na base:{" "}
          <span className="font-semibold text-foreground">{formatMes(ultimoMes)}</span>
        </div>
      </div>
    </div>
  );
}
