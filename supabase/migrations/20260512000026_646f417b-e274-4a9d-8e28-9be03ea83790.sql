-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Columns
ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS status_aprovacao public.approval_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text;

-- Backfill existing rows: sindicos approved; existing moradores approved (legacy data)
UPDATE public.perfis SET status_aprovacao = 'aprovado' WHERE status_aprovacao = 'pendente';

-- 3. Update signup trigger so new moradores are pending, sindicos auto-approved
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  default_condo UUID;
  v_role public.user_role;
BEGIN
  SELECT id INTO default_condo FROM public.condominios ORDER BY created_at LIMIT 1;
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'morador');
  INSERT INTO public.perfis (id, nome, email, telefone, cpf, role, condominio_id, unidade, status_aprovacao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cpf',
    v_role,
    default_condo,
    NEW.raw_user_meta_data->>'unidade',
    CASE WHEN v_role = 'sindico' THEN 'aprovado'::public.approval_status ELSE 'pendente'::public.approval_status END
  );
  RETURN NEW;
END;
$function$;

-- 4. Helper to check approval (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_approved_morador()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis
    WHERE id = auth.uid()
      AND (role = 'sindico' OR status_aprovacao = 'aprovado')
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_approved_morador() TO authenticated;

-- 5. Tighten RLS on carregadores, reservas, fila_espera
DROP POLICY IF EXISTS "read condo carregadores" ON public.carregadores;
CREATE POLICY "read condo carregadores" ON public.carregadores
  FOR SELECT TO authenticated
  USING (condominio_id = public.get_my_condominio_id() AND public.is_approved_morador());

DROP POLICY IF EXISTS "read reservas in condo" ON public.reservas;
CREATE POLICY "read reservas in condo" ON public.reservas
  FOR SELECT TO authenticated
  USING (
    public.is_approved_morador() AND (
      perfil_id = auth.uid()
      OR (public.get_my_role() = 'sindico'::public.user_role AND carregador_id IN (
        SELECT id FROM public.carregadores WHERE condominio_id = public.get_my_condominio_id()
      ))
      OR carregador_id IN (
        SELECT id FROM public.carregadores WHERE condominio_id = public.get_my_condominio_id()
      )
    )
  );

DROP POLICY IF EXISTS "create own reservas" ON public.reservas;
CREATE POLICY "create own reservas" ON public.reservas
  FOR INSERT TO authenticated
  WITH CHECK (perfil_id = auth.uid() AND public.is_approved_morador());

DROP POLICY IF EXISTS "read fila in condo" ON public.fila_espera;
CREATE POLICY "read fila in condo" ON public.fila_espera
  FOR SELECT TO authenticated
  USING (
    public.is_approved_morador() AND
    carregador_id IN (SELECT id FROM public.carregadores WHERE condominio_id = public.get_my_condominio_id())
  );

DROP POLICY IF EXISTS "join own fila" ON public.fila_espera;
CREATE POLICY "join own fila" ON public.fila_espera
  FOR INSERT TO authenticated
  WITH CHECK (perfil_id = auth.uid() AND public.is_approved_morador());
