import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase, supabaseConfigurado } from "@/integrations/supabase/client";

type AuthState = {
  /** true enquanto a sessão (e o papel) ainda estão sendo carregados no navegador. */
  carregando: boolean;
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  /** Sem Lovable Cloud configurado: o painel abre em modo de pré-visualização, sem dados. */
  modoPreview: boolean;
  entrar: (email: string, senha: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function buscarIsAdmin(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) {
    console.error("Erro ao verificar papel do usuário", error);
    return false;
  }
  return data != null;
}

function traduzirErro(mensagem: string): string {
  if (/invalid login credentials/i.test(mensagem)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(mensagem))
    return "E-mail ainda não confirmado. Verifique o convite.";
  if (/rate limit|too many/i.test(mensagem)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/failed to fetch|network/i.test(mensagem)) return "Não foi possível conectar ao servidor.";
  return mensagem;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(supabaseConfigurado);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let ativo = true;

    const aplicar = async (s: Session | null) => {
      const admin = s ? await buscarIsAdmin(s.user.id) : false;
      if (!ativo) return;
      setSession(s);
      setIsAdmin(admin);
      setCarregando(false);
    };

    // Callback síncrono: chamadas ao Supabase dentro dele podem travar, então adiamos.
    const { data } = client.auth.onAuthStateChange((_evento, s) => {
      setTimeout(() => void aplicar(s), 0);
    });
    void client.auth.getSession().then(({ data: d }) => aplicar(d.session));

    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    if (!supabase) return { erro: "Lovable Cloud não está configurado." };
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    return { erro: error ? traduzirErro(error.message) : null };
  }, []);

  const sair = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const valor = useMemo<AuthState>(
    () => ({
      carregando,
      session,
      user: session?.user ?? null,
      isAdmin: supabaseConfigurado ? isAdmin : true,
      modoPreview: !supabaseConfigurado,
      entrar,
      sair,
    }),
    [carregando, session, isAdmin, entrar, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}
