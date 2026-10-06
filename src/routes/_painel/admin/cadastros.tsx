import { createFileRoute } from "@tanstack/react-router";
import { Database } from "lucide-react";

import { CabecalhoPagina } from "@/components/painel/cabecalho-pagina";

const ABAS = {
  classificacao: "Classificação de subgrupos",
  ativos: "Ativos (grupos)",
  "mapa-manutencao": "Mapa de manutenção",
  "contas-pessoal": "Contas de pessoal",
  semirreboques: "Semirreboques",
  parametros: "Parâmetros",
} as const;

type Aba = keyof typeof ABAS;

export const Route = createFileRoute("/_painel/admin/cadastros")({
  validateSearch: (search: Record<string, unknown>): { aba?: Aba } =>
    typeof search["aba"] === "string" && search["aba"] in ABAS ? { aba: search["aba"] as Aba } : {},
  head: () => ({ meta: [{ title: "Cadastros · Painel de Mecanizado" }] }),
  component: Cadastros,
});

function Cadastros() {
  const { aba } = Route.useSearch();
  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo={aba ? `Cadastros › ${ABAS[aba]}` : "Cadastros"}
        descricao="Usuários convidados, classificação de subgrupos, ativos, mapa de manutenção e parâmetros."
        icone={Database}
      />
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-card p-8 text-center">
        <p className="font-medium">Em construção</p>
        <p className="text-sm text-muted-foreground">
          {aba === "mapa-manutencao"
            ? "Aqui ficará a lista de despesas em A CLASSIFICAR para atribuir uma classe."
            : "Disponível apenas para administradores."}
        </p>
      </div>
    </div>
  );
}
