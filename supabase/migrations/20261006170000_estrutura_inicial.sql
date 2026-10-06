-- Painel de Mecanizado — estrutura inicial
-- Papéis de acesso, grupos e ativos (patrimônios) usados pela barra de filtros.

-- Papéis ---------------------------------------------------------------------
create type public.app_role as enum ('admin', 'usuario');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- security definer evita recursão de RLS ao checar papéis dentro de políticas
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

create policy "Usuário lê os próprios papéis"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Admin gerencia papéis"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Empresas -------------------------------------------------------------------
create type public.empresa as enum ('VC', 'OL', 'PALMEIRAS');

-- Grupos de ativos -----------------------------------------------------------
create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table public.grupos enable row level security;

create policy "Autenticados leem grupos"
  on public.grupos for select to authenticated using (true);

create policy "Admin gerencia grupos"
  on public.grupos for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Ativos (frota, máquinas e implementos) ------------------------------------
create table public.ativos (
  id uuid primary key default gen_random_uuid(),
  patrimonio text not null unique, -- número M, ex.: M1234
  nome text not null,
  grupo_id uuid references public.grupos (id) on delete set null,
  empresa public.empresa,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index ativos_grupo_id_idx on public.ativos (grupo_id);

alter table public.ativos enable row level security;

create policy "Autenticados leem ativos"
  on public.ativos for select to authenticated using (true);

create policy "Admin gerencia ativos"
  on public.ativos for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
