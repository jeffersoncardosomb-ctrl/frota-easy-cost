import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Tema = "claro" | "escuro";

const CHAVE = "painel-tema";

/** Script inline no <head> para aplicar o tema antes da pintura (evita piscar). */
export const scriptTemaInicial = `(function(){try{if(localStorage.getItem("${CHAVE}")==="escuro"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

const TemaContext = createContext<{ tema: Tema; alternar: () => void } | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>("claro");

  useEffect(() => {
    setTema(document.documentElement.classList.contains("dark") ? "escuro" : "claro");
  }, []);

  const alternar = useCallback(() => {
    setTema((atual) => {
      const novo: Tema = atual === "escuro" ? "claro" : "escuro";
      document.documentElement.classList.toggle("dark", novo === "escuro");
      try {
        localStorage.setItem(CHAVE, novo);
      } catch {
        // armazenamento indisponível: o tema vale só para esta aba
      }
      return novo;
    });
  }, []);

  return <TemaContext.Provider value={{ tema, alternar }}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error("useTema precisa estar dentro de <TemaProvider>.");
  return ctx;
}
