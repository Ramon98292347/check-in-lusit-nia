
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- Enum for user role
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('administrador','funcionario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "usuarios veem seus proprios roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'administrador'));

-- perfis
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados leem perfis" ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuario atualiza proprio perfil" ON public.perfis FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "usuario cria proprio perfil" ON public.perfis FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_perfis_updated BEFORE UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger cria perfil ao inscrever
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'funcionario');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- acomodacoes
CREATE TABLE public.acomodacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT,
  descricao TEXT,
  capacidade_adultos INTEGER DEFAULT 1,
  capacidade_criancas INTEGER DEFAULT 0,
  valor_diaria NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'disponivel',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acomodacoes TO authenticated;
GRANT ALL ON public.acomodacoes TO service_role;
GRANT SELECT ON public.acomodacoes TO anon;
ALTER TABLE public.acomodacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publico le acomodacoes ativas" ON public.acomodacoes FOR SELECT TO anon USING (ativo = true);
CREATE POLICY "autenticados leem acomodacoes" ON public.acomodacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados gerenciam acomodacoes" ON public.acomodacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_acomodacoes_updated BEFORE UPDATE ON public.acomodacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- hospedes
CREATE TABLE public.hospedes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  nascimento DATE,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  placa_veiculo TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospedes TO authenticated;
GRANT INSERT ON public.hospedes TO anon;
GRANT ALL ON public.hospedes TO service_role;
ALTER TABLE public.hospedes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publico insere hospede" ON public.hospedes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "autenticados leem hospedes" ON public.hospedes FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados gerenciam hospedes" ON public.hospedes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_hospedes_cpf ON public.hospedes(cpf);
CREATE INDEX idx_hospedes_telefone ON public.hospedes(telefone);
CREATE TRIGGER trg_hospedes_updated BEFORE UPDATE ON public.hospedes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- hospedagens
CREATE TABLE public.hospedagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospede_id UUID REFERENCES public.hospedes(id) ON DELETE SET NULL,
  acomodacao_id UUID REFERENCES public.acomodacoes(id) ON DELETE SET NULL,
  checkin DATE NOT NULL,
  checkout DATE NOT NULL,
  adultos INTEGER DEFAULT 1,
  criancas INTEGER DEFAULT 0,
  qtd_diarias INTEGER DEFAULT 1,
  valor_diaria NUMERIC(10,2) DEFAULT 0,
  valor_hospedagem NUMERIC(10,2) DEFAULT 0,
  valor_consumo NUMERIC(10,2) DEFAULT 0,
  valor_danos NUMERIC(10,2) DEFAULT 0,
  desconto NUMERIC(10,2) DEFAULT 0,
  valor_total NUMERIC(10,2) DEFAULT 0,
  valor_pago NUMERIC(10,2) DEFAULT 0,
  saldo NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pre_cadastro',
  observacoes TEXT,
  nf TEXT,
  origem TEXT DEFAULT 'pre_cadastro',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospedagens TO authenticated;
GRANT INSERT ON public.hospedagens TO anon;
GRANT ALL ON public.hospedagens TO service_role;
ALTER TABLE public.hospedagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publico insere hospedagem" ON public.hospedagens FOR INSERT TO anon WITH CHECK (status = 'pre_cadastro');
CREATE POLICY "autenticados leem hospedagens" ON public.hospedagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados gerenciam hospedagens" ON public.hospedagens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_hospedagens_status ON public.hospedagens(status);
CREATE INDEX idx_hospedagens_checkin ON public.hospedagens(checkin);
CREATE INDEX idx_hospedagens_checkout ON public.hospedagens(checkout);
CREATE INDEX idx_hospedagens_acomodacao ON public.hospedagens(acomodacao_id);
CREATE TRIGGER trg_hospedagens_updated BEFORE UPDATE ON public.hospedagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- acompanhantes
CREATE TABLE public.acompanhantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospedagem_id UUID REFERENCES public.hospedagens(id) ON DELETE CASCADE,
  nome TEXT,
  cpf TEXT,
  nascimento DATE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acompanhantes TO authenticated;
GRANT INSERT ON public.acompanhantes TO anon;
GRANT ALL ON public.acompanhantes TO service_role;
ALTER TABLE public.acompanhantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publico insere acompanhante" ON public.acompanhantes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "autenticados gerenciam acompanhantes" ON public.acompanhantes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_acompanhantes_hospedagem ON public.acompanhantes(hospedagem_id);
CREATE TRIGGER trg_acompanhantes_updated BEFORE UPDATE ON public.acompanhantes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- produtos_consumo
CREATE TABLE public.produtos_consumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  valor_unitario NUMERIC(10,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos_consumo TO authenticated;
GRANT ALL ON public.produtos_consumo TO service_role;
ALTER TABLE public.produtos_consumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados gerenciam produtos" ON public.produtos_consumo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos_consumo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- vistorias
CREATE TABLE public.vistorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospedagem_id UUID REFERENCES public.hospedagens(id) ON DELETE CASCADE,
  acomodacao_id UUID REFERENCES public.acomodacoes(id) ON DELETE SET NULL,
  funcionario_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  quarto_vistoriado BOOLEAN DEFAULT false,
  houve_consumo BOOLEAN DEFAULT false,
  houve_dano BOOLEAN DEFAULT false,
  descricao_dano TEXT,
  valor_dano NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  valor_total_consumo NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vistorias TO authenticated;
GRANT ALL ON public.vistorias TO service_role;
ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados gerenciam vistorias" ON public.vistorias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_vistorias_hospedagem ON public.vistorias(hospedagem_id);
CREATE TRIGGER trg_vistorias_updated BEFORE UPDATE ON public.vistorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- itens_vistoria
CREATE TABLE public.itens_vistoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vistoria_id UUID REFERENCES public.vistorias(id) ON DELETE CASCADE,
  hospedagem_id UUID REFERENCES public.hospedagens(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos_consumo(id) ON DELETE SET NULL,
  nome_produto TEXT,
  quantidade INTEGER DEFAULT 0,
  valor_unitario NUMERIC(10,2) DEFAULT 0,
  valor_total NUMERIC(10,2) DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_vistoria TO authenticated;
GRANT ALL ON public.itens_vistoria TO service_role;
ALTER TABLE public.itens_vistoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados gerenciam itens_vistoria" ON public.itens_vistoria FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_itens_vistoria_hospedagem ON public.itens_vistoria(hospedagem_id);

-- pagamentos
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospedagem_id UUID REFERENCES public.hospedagens(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) DEFAULT 0,
  forma_pagamento TEXT,
  observacao TEXT,
  pago_em TIMESTAMPTZ DEFAULT now(),
  criado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados gerenciam pagamentos" ON public.pagamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_pagamentos_hospedagem ON public.pagamentos(hospedagem_id);

-- documentos_gerados
CREATE TABLE public.documentos_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospedagem_id UUID REFERENCES public.hospedagens(id) ON DELETE CASCADE,
  tipo_documento TEXT,
  canal TEXT,
  status TEXT,
  payload JSONB,
  resposta_webhook JSONB,
  enviado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_gerados TO authenticated;
GRANT ALL ON public.documentos_gerados TO service_role;
ALTER TABLE public.documentos_gerados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados gerenciam documentos" ON public.documentos_gerados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- configuracoes_sistema
CREATE TABLE public.configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor TEXT,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_sistema TO authenticated;
GRANT ALL ON public.configuracoes_sistema TO service_role;
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados leem config" ON public.configuracoes_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin gerencia config" ON public.configuracoes_sistema FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador')) WITH CHECK (public.has_role(auth.uid(),'administrador'));
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.configuracoes_sistema FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
INSERT INTO public.acomodacoes (nome, tipo, valor_diaria, capacidade_adultos) VALUES
  ('AP Luxo','Apartamento',250,3),
  ('AP Standard','Apartamento',180,2),
  ('Chalé Madeira','Chalé',300,4),
  ('Chalé Jasmin','Chalé',350,4),
  ('Chalé Master','Chalé',450,4);

INSERT INTO public.produtos_consumo (nome, categoria, valor_unitario) VALUES
  ('Água mineral','Bebida',4),
  ('Refrigerante','Bebida',6),
  ('Coca-Cola','Bebida',7),
  ('Suco','Bebida',5),
  ('Chocolate','Alimento',8),
  ('Salgadinho','Alimento',6),
  ('Limpeza extra','Serviço',30),
  ('Toalha danificada','Outros',40),
  ('Controle remoto danificado','Outros',80);

INSERT INTO public.configuracoes_sistema (chave, descricao) VALUES
  ('webhook_ficha_hospede','Webhook n8n para gerar Ficha de Hóspede'),
  ('webhook_controle_consumo','Webhook n8n para gerar Controle de Consumo'),
  ('webhook_whatsapp','Webhook n8n para envio por WhatsApp'),
  ('webhook_email','Webhook n8n para envio por e-mail');
