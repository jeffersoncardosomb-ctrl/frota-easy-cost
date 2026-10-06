-- Guarda o e-mail de quem importou, para o histórico mostrar "quem" sem
-- precisar ler auth.users pelo navegador.
alter table public.importacoes add column if not exists criado_por_email text;
