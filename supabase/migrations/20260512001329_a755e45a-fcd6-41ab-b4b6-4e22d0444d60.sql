-- Trigger: morador aprovado
CREATE OR REPLACE FUNCTION public.notify_perfil_aprovado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status_aprovacao = 'aprovado' AND (OLD.status_aprovacao IS DISTINCT FROM 'aprovado') THEN
    INSERT INTO public.notifications (perfil_id, tipo, titulo, mensagem)
    VALUES (NEW.id, 'aprovacao', 'Cadastro aprovado!', 'Bem-vindo ao PlugCondo. Você já pode reservar carregadores.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_perfil_aprovado ON public.perfis;
CREATE TRIGGER trg_notify_perfil_aprovado
AFTER UPDATE OF status_aprovacao ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.notify_perfil_aprovado();

-- Trigger: reserva ativa / finalizada
CREATE OR REPLACE FUNCTION public.notify_reserva_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'ativa' AND (OLD.status IS DISTINCT FROM 'ativa') THEN
    INSERT INTO public.notifications (perfil_id, tipo, titulo, mensagem, carregador_id)
    VALUES (NEW.perfil_id, 'reserva', 'Reserva confirmada!', 'Dirija-se ao carregador para iniciar a recarga.', NEW.carregador_id);
  ELSIF NEW.status = 'finalizada' AND (OLD.status IS DISTINCT FROM 'finalizada') THEN
    INSERT INTO public.notifications (perfil_id, tipo, titulo, mensagem, carregador_id)
    VALUES (
      NEW.perfil_id, 'reserva', 'Recarga finalizada',
      'Total: ' || to_char(COALESCE(NEW.custo_total, 0), 'FM"R$" 999G990D00'),
      NEW.carregador_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_reserva_status ON public.reservas;
CREATE TRIGGER trg_notify_reserva_status
AFTER UPDATE OF status ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.notify_reserva_status();

-- Trigger: fila notificada
CREATE OR REPLACE FUNCTION public.notify_fila_chamada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.notificado = true AND (OLD.notificado IS DISTINCT FROM true) THEN
    INSERT INTO public.notifications (perfil_id, tipo, titulo, mensagem, carregador_id, expira_em)
    VALUES (
      NEW.perfil_id, 'fila', 'Sua vez chegou!',
      'O carregador foi liberado. Confirme sua reserva em até 5 minutos.',
      NEW.carregador_id, now() + interval '5 minutes'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_fila_chamada ON public.fila_espera;
CREATE TRIGGER trg_notify_fila_chamada
AFTER UPDATE OF notificado ON public.fila_espera
FOR EACH ROW EXECUTE FUNCTION public.notify_fila_chamada();

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;