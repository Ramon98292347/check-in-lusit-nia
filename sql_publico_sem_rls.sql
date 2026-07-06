-- CHECK-IN LUSITANIA
-- DEIXAR O BANCO PUBLICO SEM RLS
--
-- Execute este arquivo no SQL Editor do Supabase para o sistema simples.
-- Ele remove RLS das tabelas usadas pelo projeto e libera acesso anonimo.

-- Tabelas principais usadas no sistema
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acomodacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospedes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospedagens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acompanhantes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_sistema TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_gerados TO anon;

-- Tabelas auxiliares que ainda existem no banco
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos_consumo TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vistorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_vistoria TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_internos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO anon;

-- Desativa RLS para nao depender de login do Supabase
ALTER TABLE public.acomodacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospedes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospedagens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.acompanhantes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_gerados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_consumo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vistorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_vistoria DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_internos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Se quiser, voce pode remover as policies antigas depois.
-- Nao e obrigatorio, porque com RLS desativado elas deixam de bloquear.
