-- Administradores iniciais: estes e-mails viram admin automaticamente,
-- tanto se o usuário já existir quanto quando ele for criado depois
-- (convite ou "Add user" no painel de autenticação do Cloud).
-- A senha NÃO fica aqui: é definida na criação do usuário.

create table if not exists public.admins_iniciais (
  email text primary key
);

alter table public.admins_iniciais enable row level security;
-- sem políticas: só o banco (funções security definer) lê esta tabela

insert into public.admins_iniciais (email) values
  ('jeffersoncardosomb@gmail.com'),
  ('jefferson.cruz@otaviolage.com')
on conflict (email) do nothing;

create or replace function public.promover_admin_inicial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.admins_iniciais where lower(email) = lower(new.email)) then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario_promover_admin on auth.users;
create trigger ao_criar_usuario_promover_admin
  after insert or update of email on auth.users
  for each row execute function public.promover_admin_inicial();

-- usuários que já existem
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
join public.admins_iniciais a on lower(a.email) = lower(u.email)
on conflict (user_id, role) do nothing;
