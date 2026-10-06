import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { AlertCircle, Loader2, Sprout } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

/** Só aceita caminhos internos, para não virar redirecionamento aberto. */
function destinoSeguro(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.startsWith("/") && !valor.startsWith("//")
    ? valor
    : undefined;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = destinoSeguro(search["redirect"]);
    return redirect ? { redirect } : {};
  },
  head: () => ({ meta: [{ title: "Entrar · Painel de Mecanizado" }] }),
  component: Login,
});

function VoltarPara({ destino }: { destino: string }) {
  const router = useRouter();
  useEffect(() => {
    router.history.replace(destino);
  }, [router, destino]);
  return null;
}

function Login() {
  const { session, carregando, entrar, modoPreview } = useAuth();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!carregando && (session || modoPreview)) {
    const destino = destinoSeguro(redirect);
    return destino && destino !== "/login" ? (
      <VoltarPara destino={destino} />
    ) : (
      <Navigate to="/visao-geral" replace />
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const { erro } = await entrar(email.trim(), senha);
    setEnviando(false);
    if (erro) setErro(erro);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sprout className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Painel de Mecanizado</h1>
            <p className="text-sm text-muted-foreground">
              Custo de frota, máquinas e implementos agrícolas
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entrar</CardTitle>
            <CardDescription>Use o e-mail e a senha do seu convite.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              {erro && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={enviando || carregando}>
                {enviando && <Loader2 className="size-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Acesso somente por convite. Fale com o administrador para obter acesso.
        </p>
      </div>
    </div>
  );
}
