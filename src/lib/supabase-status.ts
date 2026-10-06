// O cliente gerado automaticamente não exporta mais essa flag, então ela é
// calculada aqui a partir das variáveis que o Lovable Cloud injeta no projeto.
const URL = import.meta.env.VITE_SUPABASE_URL;
const CHAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** true quando o backend está conectado; false no modo de pré-visualização. */
export const supabaseConfigurado = Boolean(URL && CHAVE);
