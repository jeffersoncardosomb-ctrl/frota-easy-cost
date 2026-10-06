import type { UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle, CloudOff, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mostra sem banco / erro / carregando para um conjunto de consultas e só
 * renderiza `children` quando todas terminaram com sucesso.
 */
export function EstadoConsultas({
  consultas,
  esqueleto,
  children,
}: {
  consultas: UseQueryResult[];
  esqueleto?: ReactNode;
  children: () => ReactNode;
}) {
  if (supabase == null) {
    return (
      <AvisoVazio
        icone={CloudOff}
        titulo="Sem banco conectado"
        texto="Modo de pré-visualização: habilite o Lovable Cloud para ver os dados."
      />
    );
  }
  const comErro = consultas.find((c) => c.isError);
  if (comErro) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Não foi possível carregar os dados</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-3">
          {comErro.error instanceof Error ? comErro.error.message : "Erro desconhecido."}
          <Button
            size="sm"
            variant="outline"
            onClick={() => consultas.forEach((c) => c.isError && void c.refetch())}
          >
            <RefreshCw className="size-3.5" /> Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (consultas.some((c) => c.isPending)) {
    return (
      <div aria-busy="true" aria-label="Carregando dados">
        {esqueleto ?? <Skeleton className="h-96" />}
      </div>
    );
  }
  return <>{children()}</>;
}

export function AvisoVazio({
  icone: Icone,
  titulo,
  texto,
  children,
}: {
  icone: typeof CloudOff;
  titulo: string;
  texto: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card p-8 text-center">
      <Icone className="size-8 text-muted-foreground/60" />
      <p className="font-medium">{titulo}</p>
      <p className="max-w-md text-sm text-muted-foreground">{texto}</p>
      {children}
    </div>
  );
}
