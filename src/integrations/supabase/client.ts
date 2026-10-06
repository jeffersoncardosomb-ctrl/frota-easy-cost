import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lovable Cloud injeta estas variáveis no .env quando o Cloud é habilitado.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// Uso: import { supabase } from "@/integrations/supabase/client";
export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      auth: {
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
