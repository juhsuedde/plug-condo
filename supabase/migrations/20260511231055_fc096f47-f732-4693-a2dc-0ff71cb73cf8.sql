
-- Enums
CREATE TYPE public.user_role AS ENUM ('morador', 'sindico');
CREATE TYPE public.charger_status AS ENUM ('disponivel', 'ocupado', 'manutencao');
CREATE TYPE public.reservation_status AS ENUM ('agendada', 'ativa', 'concluida', 'cancelada');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'reembolsado');

-- Condominios
CREATE TABLE public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  cnpj TEXT,
  qtd_unidades INT NOT NULL DEFAULT 0,
  preco_kwh NUMERIC(10,4) NOT NULL DEFAULT 0.95,
  taxa_uso NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfis
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'morador',
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE SET NULL,
  unidade TEXT,
  veiculo_marca TEXT,
  veiculo_modelo TEXT,
  veiculo_placa TEXT,
  aprovado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_perfis_condominio ON public.perfis(condominio_id);

-- Carregadores
CREATE TABLE public.carregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  localizacao TEXT NOT NULL,
  potencia_kw NUMERIC(6,2) NOT NULL DEFAULT 7.4,
  status public.charger_status NOT NULL DEFAULT 'disponivel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_carregadores_condominio ON public.carregadores(condominio_id);

-- Reservas
CREATE TABLE public.reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carregador_id UUID NOT NULL REFERENCES public.carregadores(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  status public.reservation_status NOT NULL DEFAULT 'agendada',
  kwh_consumido NUMERIC(10,3),
  custo_total NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservas_perfil ON public.reservas(perfil_id);
CREATE INDEX idx_reservas_carregador_data ON public.reservas(carregador_id, data);

-- Fila de espera
CREATE TABLE public.fila_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carregador_id UUID NOT NULL REFERENCES public.carregadores(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  posicao INT NOT NULL,
  hora_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  notificado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fila_carregador ON public.fila_espera(carregador_id);

-- Transações
CREATE TABLE public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
  perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  valor_energia NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_taxa NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL,
  status_pagamento public.payment_status NOT NULL DEFAULT 'pendente',
  pix_txid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transacoes_perfil ON public.transacoes(perfil_id);

-- Helper functions (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_my_condominio_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT condominio_id FROM public.perfis WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.perfis WHERE id = auth.uid()
$$;

-- Enable RLS
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

-- Condominios: anyone authenticated can read (needed for signup choosing condo)
CREATE POLICY "auth read condominios" ON public.condominios FOR SELECT TO authenticated USING (true);
CREATE POLICY "sindico update own condo" ON public.condominios FOR UPDATE TO authenticated
  USING (id = public.get_my_condominio_id() AND public.get_my_role() = 'sindico');

-- Perfis
CREATE POLICY "read own profile" ON public.perfis FOR SELECT TO authenticated
  USING (id = auth.uid() OR (condominio_id = public.get_my_condominio_id() AND public.get_my_role() = 'sindico'));
CREATE POLICY "insert own profile" ON public.perfis FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.perfis FOR UPDATE TO authenticated
  USING (id = auth.uid() OR (condominio_id = public.get_my_condominio_id() AND public.get_my_role() = 'sindico'));

-- Carregadores
CREATE POLICY "read condo carregadores" ON public.carregadores FOR SELECT TO authenticated
  USING (condominio_id = public.get_my_condominio_id());
CREATE POLICY "sindico manage carregadores" ON public.carregadores FOR ALL TO authenticated
  USING (condominio_id = public.get_my_condominio_id() AND public.get_my_role() = 'sindico')
  WITH CHECK (condominio_id = public.get_my_condominio_id() AND public.get_my_role() = 'sindico');

-- Reservas
CREATE POLICY "read reservas in condo" ON public.reservas FOR SELECT TO authenticated
  USING (
    perfil_id = auth.uid() OR
    (public.get_my_role() = 'sindico' AND carregador_id IN (SELECT id FROM public.carregadores WHERE condominio_id = public.get_my_condominio_id()))
    OR carregador_id IN (SELECT id FROM public.carregadores WHERE condominio_id = public.get_my_condominio_id())
  );
CREATE POLICY "create own reservas" ON public.reservas FOR INSERT TO authenticated WITH CHECK (perfil_id = auth.uid());
CREATE POLICY "update own reservas" ON public.reservas FOR UPDATE TO authenticated
  USING (perfil_id = auth.uid() OR public.get_my_role() = 'sindico');
CREATE POLICY "delete own reservas" ON public.reservas FOR DELETE TO authenticated
  USING (perfil_id = auth.uid() OR public.get_my_role() = 'sindico');

-- Fila
CREATE POLICY "read fila in condo" ON public.fila_espera FOR SELECT TO authenticated
  USING (carregador_id IN (SELECT id FROM public.carregadores WHERE condominio_id = public.get_my_condominio_id()));
CREATE POLICY "join own fila" ON public.fila_espera FOR INSERT TO authenticated WITH CHECK (perfil_id = auth.uid());
CREATE POLICY "leave own fila" ON public.fila_espera FOR DELETE TO authenticated
  USING (perfil_id = auth.uid() OR public.get_my_role() = 'sindico');

-- Transações
CREATE POLICY "read transacoes" ON public.transacoes FOR SELECT TO authenticated
  USING (perfil_id = auth.uid() OR public.get_my_role() = 'sindico');
CREATE POLICY "create own transacoes" ON public.transacoes FOR INSERT TO authenticated WITH CHECK (perfil_id = auth.uid());
CREATE POLICY "update own transacoes" ON public.transacoes FOR UPDATE TO authenticated
  USING (perfil_id = auth.uid() OR public.get_my_role() = 'sindico');

-- Auto profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_condo UUID;
BEGIN
  SELECT id INTO default_condo FROM public.condominios ORDER BY created_at LIMIT 1;
  INSERT INTO public.perfis (id, nome, email, telefone, cpf, role, condominio_id, unidade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cpf',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'morador'),
    default_condo,
    NEW.raw_user_meta_data->>'unidade'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.carregadores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fila_espera;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;

-- Seed demo moved to seed-demo.sql (only run in development)
