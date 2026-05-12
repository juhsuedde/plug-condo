ALTER TABLE public.condominios
  ADD COLUMN IF NOT EXISTS horario_inicio TIME NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS horario_fim TIME NOT NULL DEFAULT '23:00',
  ADD COLUMN IF NOT EXISTS duracao_padrao_horas INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS limite_reservas_futuras INT NOT NULL DEFAULT 2;

CREATE OR REPLACE FUNCTION public.enforce_reservation_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INT;
  v_limit INT;
  v_condo UUID;
BEGIN
  SELECT condominio_id INTO v_condo FROM public.perfis WHERE id = NEW.perfil_id;
  SELECT COALESCE(limite_reservas_futuras, 2) INTO v_limit FROM public.condominios WHERE id = v_condo;
  IF v_limit IS NULL THEN v_limit := 2; END IF;

  SELECT COUNT(*) INTO active_count
  FROM public.reservas
  WHERE perfil_id = NEW.perfil_id
    AND status IN ('agendada', 'ativa')
    AND data >= CURRENT_DATE;

  IF active_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de % reservas futuras atingido', v_limit USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;