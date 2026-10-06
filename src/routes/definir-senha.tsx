import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Sprout } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Destino do link de convite (e de redefinição de senha) enviado por e-mail.
export const Route = createFileRoute("/definir-senha")({
  head: () => ({ meta: [{ title: "Definir senha · Painel de Mecanizado" }] }),
  component: DefinirSenha,
});

function DefinirSenha() {
  const { session, carregando } = useAuth();
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Carregando" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirmacao) return setErro("As senhas não conferem.");
    setEnviando(true);
    setErro(null);
    const { error } = await supabase!.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return setErro(error.message);
    void navigate({ to: "/visao-geral" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sprout className="size-6" />
          </span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Definir senha</CardTitle>
            <CardDescription>{session.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmacao">Confirmar senha</Label>
                <Input
                  id="confirmacao"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                />
              </div>
              {erro && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando && <Loader2 className="size-4 animate-spin" />}
                Salvar e entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
