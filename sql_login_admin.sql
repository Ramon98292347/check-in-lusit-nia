-- Login interno com primeiro acesso criando a senha.
-- Usuários fixos: recepcao e admin
-- O app salva o hash da senha na tabela usuarios_internos na primeira vez de cada um.

create extension if not exists pgcrypto;

create table if not exists public.usuarios_internos (
  id uuid not null default gen_random_uuid(),
  username text not null,
  nome text not null,
  role app_role not null default 'administrador',
  senha_hash text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint usuarios_internos_pkey primary key (id)
);

create unique index if not exists usuarios_internos_username_key
  on public.usuarios_internos (username);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_usuarios_internos_updated on public.usuarios_internos;
create trigger trg_usuarios_internos_updated
before update on public.usuarios_internos
for each row
execute function public.update_updated_at_column();

-- Opcional:
-- Para zerar o login e pedir nova senha no próximo acesso, remova o registro abaixo.
-- delete from public.usuarios_internos where username in ('recepcao', 'admin');
