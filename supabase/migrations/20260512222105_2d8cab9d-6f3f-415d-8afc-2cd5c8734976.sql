
ALTER TABLE public.condominios
  ADD COLUMN IF NOT EXISTS onboarding_completo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demanda_contratada_kw numeric NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS compliance jsonb NOT NULL DEFAULT '{
    "botao_emergencia": false,
    "deteccao_incendio": false,
    "sinalizacao": false,
    "capacidade_eletrica": false,
    "medicao_individual": false,
    "doc_save": false,
    "doc_art": false,
    "doc_nbr17019": false
  }'::jsonb;

DO $$ BEGIN
  CREATE TYPE public.spot_type AS ENUM ('compartilhado', 'privativo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.charge_billing AS ENUM ('kwh', 'hora');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.carregadores
  ADD COLUMN IF NOT EXISTS tipo public.spot_type NOT NULL DEFAULT 'compartilhado',
  ADD COLUMN IF NOT EXISTS morador_id uuid,
  ADD COLUMN IF NOT EXISTS tipo_cobranca public.charge_billing NOT NULL DEFAULT 'kwh';

CREATE TABLE IF NOT EXISTS public.repasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id uuid NOT NULL,
  valor numeric NOT NULL,
  status text NOT NULL DEFAULT 'solicitado',
  observacao text,
  solicitado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repasses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sindico read repasses" ON public.repasses;
CREATE POLICY "sindico read repasses" ON public.repasses FOR SELECT TO authenticated
  USING (condominio_id = public.get_my_condominio_id() AND public.get_my_role() = 'sindico');

DROP POLICY IF EXISTS "sindico create repasses" ON public.repasses;
CREATE POLICY "sindico create repasses" ON public.repasses FOR INSERT TO authenticated
  WITH CHECK (condominio_id = public.get_my_condominio_id() AND public.get_my_role() = 'sindico');
