-- Torna o dono do projeto administrador.
-- Só tem efeito se o usuário já existir em auth.users (convide o e-mail antes);
-- se ainda não existir, rode este insert de novo depois do convite.
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('jeffersoncardosomb@gmail.com')
on conflict (user_id, role) do nothing;
