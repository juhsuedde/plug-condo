
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'fila',
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  carregador_id UUID,
  lida BOOLEAN NOT NULL DEFAULT false,
  expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (perfil_id = auth.uid() OR get_my_role() = 'sindico'::user_role);

CREATE POLICY "update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (perfil_id = auth.uid());

CREATE POLICY "insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_notifications_perfil ON public.notifications(perfil_id, lida, created_at DESC);

-- Helper function to call edge functions via pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to invoke an edge function
CREATE OR REPLACE FUNCTION public.invoke_edge_function(fn_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id BIGINT;
  supabase_url TEXT := 'https://kfbctthtanxtbqebuwmp.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bWhhbHhyem5hbWRyeWJvZmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mjk0MjEsImV4cCI6MjA5NDEwNTQyMX0.G0jsWVp5L2TP4JKT-D7OMxW0y2Yz9bkLp91nc5tJjO4';
BEGIN
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/' || fn_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := payload
  ) INTO request_id;
  RETURN request_id;
END;
$$;

-- Trigger: when a reservation is finalizada or cancelada, calculate cost & process queue
CREATE OR REPLACE FUNCTION public.on_reserva_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'finalizada' AND (OLD.status IS DISTINCT FROM 'finalizada') THEN
    PERFORM public.invoke_edge_function('calculate-reservation-cost', jsonb_build_object('reserva_id', NEW.id));
    UPDATE public.carregadores SET status = 'disponivel' WHERE id = NEW.carregador_id;
  ELSIF NEW.status = 'cancelada' AND (OLD.status IS DISTINCT FROM 'cancelada') THEN
    UPDATE public.carregadores SET status = 'disponivel' WHERE id = NEW.carregador_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reserva_status_change
AFTER UPDATE ON public.reservas
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.on_reserva_status_change();

-- Trigger: when carregador becomes disponivel, process queue
CREATE OR REPLACE FUNCTION public.on_carregador_disponivel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'disponivel' AND (OLD.status IS DISTINCT FROM 'disponivel') THEN
    PERFORM public.invoke_edge_function('process-queue', jsonb_build_object('carregador_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_carregador_disponivel
AFTER UPDATE ON public.carregadores
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.on_carregador_disponivel();

-- Trigger: limit future reservations to 2 per resident
CREATE OR REPLACE FUNCTION public.enforce_reservation_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INT;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM public.reservas
  WHERE perfil_id = NEW.perfil_id
    AND status IN ('agendada', 'ativa')
    AND data >= CURRENT_DATE;

  IF active_count >= 2 THEN
    RAISE EXCEPTION 'Limite de 2 reservas futuras atingido' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_reservation_limit
BEFORE INSERT ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.enforce_reservation_limit();

-- Schedule grace period check every 5 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'check-reservation-grace-period',
  '*/5 * * * *',
  $$
  SELECT public.invoke_edge_function('check-reservation-grace-period', '{}'::jsonb);
  $$
);
