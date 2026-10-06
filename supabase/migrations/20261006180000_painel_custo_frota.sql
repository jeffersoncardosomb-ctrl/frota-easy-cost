-- =====================================================================
--  PAINEL DE CUSTO – FROTA, MÁQUINAS E IMPLEMENTOS  (Supabase / Lovable Cloud)
--  Espelha a planilha Custo_Frota_Painel_2026.xlsx:
--    BASE            -> lancamentos  (colunas brutas, A:X)
--    CLASSIFICAÇÃO   -> classificacao_subgrupo
--    GRUPOS          -> ativos
--    MAPA MANUT      -> mapa_manutencao + contas_pessoal
--    SEMIRREBOQUES   -> semirreboques + parametros
--  As colunas calculadas da BASE (S:AD) viram a view v_lancamentos.
-- =====================================================================

-- ---------- Perfis de acesso ----------
create type public.app_role as enum ('admin', 'viewer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'viewer',
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ---------- Cadastros (abas editáveis da planilha) ----------
create table public.classificacao_subgrupo (
  subgrupo     text primary key,
  categoria    text not null,          -- VEÍCULOS | MÁQUINAS | IMPLEMENTOS
  subcategoria text not null,          -- Veículos leves | Veículos pesados | Máquinas | Implementos
  unidade      text not null default '-' check (unidade in ('km','h','-')),
  observacao   text
);

create table public.ativos (
  m              integer primary key,  -- nº do patrimônio (coluna M)
  patrimonio     text,
  subgrupo       text,                 -- subgrupo do cadastro
  grupo_override text,                 -- "Grupo (edite aqui)"; vazio = usa o subgrupo
  observacao     text
);

create table public.mapa_manutencao (
  despesa text primary key,            -- DESPESA como vem do sistema
  classe  text not null
);

create table public.contas_pessoal (
  conta text primary key               -- CONTA que vai para SALÁRIO em vez de MANUTENÇÃO
);

create table public.semirreboques (
  m integer primary key                -- M cujo custo é rateado para os cavalos mecânicos
);

create table public.parametros (
  chave text primary key,
  valor text not null,
  descricao text
);

insert into public.parametros (chave, valor, descricao) values
  ('rateio_subgrupo',           'CAVALO MECÂNICO', 'Subgrupo que recebe o custo dos semirreboques (proporcional ao km)'),
  ('alerta_consumo_desvio',     '0.25',  'Desvio de consumo vs. referência 12m do subgrupo para gerar alerta'),
  ('alerta_consumo_min_litros', '50',    'Litros mínimos no período para avaliar consumo'),
  ('alerta_manut_min',          '5000',  'Manutenção mínima (R$) no período para alerta de manutenção atípica'),
  ('alerta_manut_multiplo',     '3',     'Manutenção do período > N x média mensal 12m = atípica');

-- ---------- Fatos (aba BASE) ----------
create table public.importacoes (
  id          uuid primary key default gen_random_uuid(),
  arquivo     text,
  meses       date[],
  linhas      integer,
  criado_por  uuid references auth.users(id),
  criado_em   timestamptz not null default now()
);

create table public.lancamentos (
  id                bigint generated always as identity primary key,
  empresa           text not null,
  mes               date not null,     -- sempre dia 01
  m                 integer not null,
  patrimonio        text,
  subgrupo          text,
  salario           numeric(14,2) not null default 0,
  custo_combustivel numeric(14,2) not null default 0,
  depreciacao       numeric(14,2) not null default 0,
  km_hr             numeric(14,2) not null default 0,  -- km (veículos) ou horas (máquinas)
  litros            numeric(14,2) not null default 0,
  produto           text,
  qtde              numeric(14,3) not null default 0,
  valor_total       numeric(14,2) not null default 0,  -- = CUSTO TOTAL da linha
  despesa           text,
  despesa_pai       text,
  conta             text,
  motorista         text,
  fazenda           text,
  importacao_id     uuid references public.importacoes(id) on delete set null
);
create index on public.lancamentos (mes);
create index on public.lancamentos (m, mes);
create index on public.lancamentos (empresa, mes);

-- ---------- View linha a linha (= colunas S:AD da BASE) ----------
create or replace view public.v_lancamentos with (security_invoker = true) as
with b as (
  select l.*,
         l.valor_total - l.salario - l.custo_combustivel - l.depreciacao as base_manut,
         coalesce(c.categoria,    'NÃO CLASSIFICADO') as categoria,
         coalesce(c.subcategoria, 'NÃO CLASSIFICADO') as subcategoria,
         coalesce(c.unidade, '-')                     as unidade,
         case when a.m is not null then coalesce(nullif(trim(a.grupo_override), ''), a.subgrupo)
              else l.subgrupo end                     as grupo,
         cp.conta is not null                         as conta_pessoal,
         mm.classe                                    as classe_mapa
  from public.lancamentos l
  left join public.classificacao_subgrupo c on upper(c.subgrupo) = upper(l.subgrupo)
  left join public.ativos a                 on a.m = l.m
  left join public.contas_pessoal cp        on upper(cp.conta) = upper(l.conta)
  left join public.mapa_manutencao mm       on upper(mm.despesa) = upper(trim(l.despesa))
), k as (
  select b.*,
         case when base_manut = 0 then null
              when conta_pessoal then 'Pessoal/encargos (lançado em manut.)'
              when upper(conta) = 'RATEIO OFICINA' then 'Oficina interna (rateio OS)'
              else coalesce(classe_mapa, 'A CLASSIFICAR') end as classe_manutencao
  from b
)
select k.id, k.empresa, k.mes, k.m, k.patrimonio, k.subgrupo, k.grupo,
       k.categoria, k.subcategoria, k.unidade,
       k.produto, k.qtde, k.despesa, k.despesa_pai, k.conta, k.motorista, k.fazenda,
       k.classe_manutencao,
       k.custo_combustivel                                         as combustivel,
       k.base_manut - p.pessoal                                    as manutencao,
       p.pessoal                                                   as pessoal_em_manut,
       k.salario + p.pessoal                                       as salario,
       k.depreciacao,
       k.valor_total                                               as custo_total,
       k.km_hr, k.litros
from k
cross join lateral (select case when k.classe_manutencao = 'Pessoal/encargos (lançado em manut.)'
                                then k.base_manut else 0 end as pessoal) p;

-- ---------- Agregado mensal por ativo (alimenta quase todo o painel) ----------
create or replace view public.v_mensal_ativo with (security_invoker = true) as
select empresa, mes, m,
       max(patrimonio) as patrimonio,
       subgrupo, grupo, categoria, subcategoria, unidade,
       sum(combustivel)  as combustivel,
       sum(manutencao)   as manutencao,
       sum(salario)      as salario,
       sum(depreciacao)  as depreciacao,
       sum(custo_total)  as custo_total,
       sum(km_hr)        as km_hr,
       sum(litros)       as litros
from public.v_lancamentos
group by empresa, mes, m, subgrupo, grupo, categoria, subcategoria, unidade;

-- ---------- Agregado mensal de manutenção por classe ----------
create or replace view public.v_mensal_manut_classe with (security_invoker = true) as
select empresa, mes, m, grupo, subcategoria,
       coalesce(classe_manutencao, 'A CLASSIFICAR') as classe,
       sum(manutencao)       as manutencao,
       sum(pessoal_em_manut) as pessoal
from public.v_lancamentos
where classe_manutencao is not null
group by 1,2,3,4,5,6;

-- ---------- Itens de manutenção ainda sem classe (para a tela de cadastro) ----------
create or replace view public.v_despesas_a_classificar with (security_invoker = true) as
select trim(despesa) as despesa, count(*) as linhas, sum(manutencao) as valor
from public.v_lancamentos
where classe_manutencao = 'A CLASSIFICAR' and despesa is not null
group by 1 order by 3 desc;

-- ---------- Subgrupos sem classificação ----------
create or replace view public.v_subgrupos_nao_classificados with (security_invoker = true) as
select subgrupo, count(distinct m) as ativos, sum(custo_total) as valor
from public.v_lancamentos where categoria = 'NÃO CLASSIFICADO'
group by 1 order by 3 desc;

-- ---------- RLS: todos logados leem; só admin grava ----------
do $$
declare t text;
begin
  foreach t in array array['classificacao_subgrupo','ativos','mapa_manutencao','contas_pessoal',
                           'semirreboques','parametros','importacoes','lancamentos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "leitura autenticados" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "escrita admin" on public.%I for all to authenticated
                    using (public.has_role(auth.uid(), ''admin'')) with check (public.has_role(auth.uid(), ''admin''))', t);
  end loop;
end $$;

alter table public.user_roles enable row level security;
create policy "ver o próprio papel" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "admin gerencia papéis" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
