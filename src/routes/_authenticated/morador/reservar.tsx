import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Zap, Loader2, Check, QrCode, Copy, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/morador/reservar")({
  component: ReservarPage,
});

const buildSlots = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const out: string[] = [];
  for (let t = startMin; t < endMin; t += 30) {
    const h = Math.floor(t / 60), m = t % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
};

type PixData = {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  expiration_date: string;
  reserva_id: string;
};

function ReservarPage() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), []);
  const [date, setDate] = useState(new Date());
  const [slot, setSlot] = useState<string | null>(null);
  const [chargerId, setChargerId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(Date.now());

  const condoId = perfil?.condominio_id;
  const dateStr = format(date, "yyyy-MM-dd");

  const carregadoresQ = useQuery({
    queryKey: ["carregadores", condoId],
    enabled: !!condoId,
    queryFn: async () => {
      const { data } = await supabase.from("carregadores").select("*").eq("condominio_id", condoId!).order("nome");
      return data || [];
    },
  });

  const reservasQ = useQuery({
    queryKey: ["reservas-day", dateStr, condoId],
    enabled: !!condoId,
    queryFn: async () => {
      const { data } = await supabase.from("reservas").select("*").eq("data", dateStr).neq("status", "cancelada");
      return data || [];
    },
  });

  const condoQ = useQuery({
    queryKey: ["condo", condoId],
    enabled: !!condoId,
    queryFn: async () => {
      const { data } = await supabase.from("condominios").select("*").eq("id", condoId!).single();
      return data;
    },
  });

  const horaInicio = (condoQ.data as any)?.horario_inicio?.slice(0, 5) ?? "07:00";
  const horaFim = (condoQ.data as any)?.horario_fim?.slice(0, 5) ?? "23:00";
  const duracaoH = Number((condoQ.data as any)?.duracao_padrao_horas ?? 2);
  const slotsPerReservation = duracaoH * 2;
  const SLOTS = useMemo(() => buildSlots(horaInicio, horaFim), [horaInicio, horaFim]);

  const occupiedSlotsByCharger = useMemo(() => {
    const m = new Map<string, Set<string>>();
    (reservasQ.data || []).forEach((r: any) => {
      const set = m.get(r.carregador_id) ?? new Set<string>();
      const start = r.hora_inicio.slice(0, 5);
      const end = r.hora_fim.slice(0, 5);
      SLOTS.forEach((s: string) => { if (s >= start && s < end) set.add(s); });
      m.set(r.carregador_id, set);
    });
    return m;
  }, [reservasQ.data, SLOTS]);

  const slotIsOccupiedAll = (s: string) => {
    const chargers = carregadoresQ.data || [];
    if (chargers.length === 0) return false;
    return chargers.every((c: any) => occupiedSlotsByCharger.get(c.id)?.has(s) || c.status === "manutencao");
  };

  const availableChargers = useMemo(() => {
    if (!slot) return [];
    return (carregadoresQ.data || []).filter((c: any) => {
      if (c.status === "manutencao") return false;
      const slotIdx = SLOTS.indexOf(slot);
      const need = Array.from({ length: slotsPerReservation }, (_, i) => SLOTS[slotIdx + i]).filter(Boolean);
      if (need.length < slotsPerReservation) return false;
      const occ = occupiedSlotsByCharger.get(c.id) ?? new Set();
      return need.every((s) => !occ.has(s));
    });
  }, [slot, carregadoresQ.data, occupiedSlotsByCharger, SLOTS, slotsPerReservation]);

  const charger = (carregadoresQ.data || []).find((c: any) => c.id === chargerId);
  const preco = condoQ.data?.preco_kwh ?? 0.95;
  const taxa = condoQ.data?.taxa_uso ?? 5;
  const estimated = charger ? Number(charger.potencia_kw) * duracaoH * Number(preco) + Number(taxa) : 0;

  // Polling do status do pagamento
  useEffect(() => {
    if (!pix || paid || expired) return;
    const iv = setInterval(async () => {
      const { data: tx } = await supabase
        .from("transacoes")
        .select("status_pagamento")
        .eq("reserva_id", pix.reserva_id)
        .maybeSingle();
      if (tx?.status_pagamento === "pago") {
        setPaid(true);
        toast.success("Pagamento confirmado!");
        setTimeout(() => navigate({ to: "/morador/reservas" }), 1600);
      } else if (tx?.status_pagamento === "cancelado") {
        setExpired(true);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [pix, paid, expired, navigate]);

  // Countdown + expiração
  useEffect(() => {
    if (!pix || paid) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [pix, paid]);

  useEffect(() => {
    if (pix && !paid && new Date(pix.expiration_date).getTime() < now) {
      setExpired(true);
    }
  }, [now, pix, paid]);

  const handleGeneratePix = async () => {
    if (!charger || !slot || !perfil) return;
    setGenerating(true);
    try {
      const slotIdx = SLOTS.indexOf(slot);
      const fim = SLOTS[slotIdx + slotsPerReservation] ?? horaFim;
      const { data: reserva, error } = await supabase
        .from("reservas")
        .insert({
          carregador_id: charger.id,
          perfil_id: perfil.id,
          data: dateStr,
          hora_inicio: slot,
          hora_fim: fim,
          status: "agendada",
        })
        .select()
        .single();
      if (error || !reserva) throw new Error(error?.message || "Erro ao criar reserva");

      await supabase.from("transacoes").insert({
        reserva_id: reserva.id,
        perfil_id: perfil.id,
        valor_energia: Number(charger.potencia_kw) * duracaoH * Number(preco),
        valor_taxa: Number(taxa),
        valor_total: estimated,
        status_pagamento: "pendente",
      });

      const { data, error: fnErr } = await supabase.functions.invoke("create-pix-payment", {
        body: { reserva_id: reserva.id, valor_total: estimated },
      });
      if (fnErr || !data?.qr_code) {
        // Limpa reserva em caso de falha do gateway
        await supabase.from("reservas").update({ status: "cancelada" }).eq("id", reserva.id);
        throw new Error(fnErr?.message || data?.error || "Não foi possível gerar o Pix");
      }
      setPix({ ...data, reserva_id: reserva.id });
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar Pix");
    } finally {
      setGenerating(false);
    }
  };

  const closeModal = async () => {
    if (pix && !paid) {
      // cancela reserva pendente
      await supabase.from("reservas").update({ status: "cancelada" }).eq("id", pix.reserva_id);
      await supabase.from("transacoes").update({ status_pagamento: "cancelado" }).eq("reserva_id", pix.reserva_id);
    }
    setPix(null);
    setExpired(false);
    setPaid(false);
  };

  const retry = async () => {
    await closeModal();
    handleGeneratePix();
  };

  const copyPix = async () => {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.qr_code);
    toast.success("Código Pix copiado");
  };

  const remaining = pix ? Math.max(0, Math.floor((new Date(pix.expiration_date).getTime() - now) / 1000)) : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="px-5 pt-8 pb-6 space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Reservar carregador</h1>
        <p className="text-sm text-muted-foreground mt-1">Escolha data, horário e carregador</p>
      </header>

      <Step n={1} label="Data">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {dates.map((d, i) => {
            const active = isSameDay(d, date);
            return (
              <button
                key={i}
                onClick={() => { setDate(d); setSlot(null); setChargerId(null); }}
                className={`min-w-[60px] py-3 rounded-2xl flex flex-col items-center transition ${
                  active ? "bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                <span className="text-[10px] uppercase opacity-80">{format(d, "EEE", { locale: ptBR }).slice(0, 3)}</span>
                <span className="text-xl font-bold">{format(d, "d")}</span>
              </button>
            );
          })}
        </div>
      </Step>

      <Step n={2} label="Horário (intervalos de 30min)">
        <div className="grid grid-cols-4 gap-2">
          {SLOTS.map((s) => {
            const disabled = slotIsOccupiedAll(s);
            const active = s === slot;
            return (
              <button
                key={s}
                disabled={disabled}
                onClick={() => { setSlot(s); setChargerId(null); }}
                className={`h-11 rounded-xl text-sm font-semibold transition ${
                  active ? "bg-primary text-primary-foreground"
                  : disabled ? "bg-muted text-muted-foreground/50 line-through"
                  : "bg-card hover:bg-primary-soft"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Step>

      {slot && (
        <Step n={3} label="Carregador disponível">
          <div className="grid grid-cols-2 gap-3">
            {availableChargers.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground text-center py-6">Nenhum carregador disponível neste horário.</p>
            )}
            {availableChargers.map((c: any) => {
              const active = c.id === chargerId;
              return (
                <button
                  key={c.id} onClick={() => setChargerId(c.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition ${
                    active ? "border-primary bg-primary-soft" : "border-transparent bg-card"
                  }`}
                >
                  <Zap size={20} className="text-primary" />
                  <div className="font-semibold mt-2">{c.nome}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.localizacao}</div>
                  <div className="text-xs font-semibold text-primary mt-1">{c.potencia_kw} kW</div>
                </button>
              );
            })}
          </div>
        </Step>
      )}

      {chargerId && charger && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-card rounded-3xl p-5 shadow-card space-y-3">
            <div className="font-bold">Resumo</div>
            <Row k="Carregador" v={charger.nome} />
            <Row k="Data" v={format(date, "dd/MM/yyyy")} />
            <Row k="Horário" v={`${slot} (${duracaoH}h)`} />
            <Row k="Energia est." v={`${(Number(charger.potencia_kw) * duracaoH).toFixed(1)} kWh`} />
            <Row k="Taxa de uso" v={brl(Number(taxa))} />
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-semibold">Total estimado</span>
              <span className="text-xl font-extrabold text-primary">{brl(estimated)}</span>
            </div>
            <button
              onClick={handleGeneratePix} disabled={generating}
              className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-semibold flex items-center justify-center gap-2 shadow-soft active:scale-[0.98] transition disabled:opacity-70"
            >
              {generating ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
              {generating ? "Gerando Pix..." : "Gerar Pix"}
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {pix && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-5"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-card rounded-3xl p-6 max-w-[360px] w-full shadow-pop relative"
            >
              <button onClick={closeModal} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted grid place-items-center">
                <X size={16} />
              </button>

              {paid ? (
                <div className="text-center py-6">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary grid place-items-center">
                    <Check size={36} className="text-primary-foreground" strokeWidth={3} />
                  </div>
                  <div className="mt-4 font-bold text-lg">Pagamento confirmado!</div>
                  <div className="text-sm text-muted-foreground mt-1">Redirecionando...</div>
                </div>
              ) : expired ? (
                <div className="text-center py-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 grid place-items-center">
                    <AlertCircle size={36} className="text-destructive" />
                  </div>
                  <div className="mt-4 font-bold text-lg">Pix expirado</div>
                  <div className="text-sm text-muted-foreground mt-1">O tempo para pagamento esgotou.</div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={closeModal} className="flex-1 h-12 rounded-2xl bg-muted font-semibold">Cancelar</button>
                    <button onClick={retry} className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold">Tentar novamente</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Pague com Pix</div>
                    <div className="text-2xl font-extrabold text-primary mt-1">{brl(estimated)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Expira em {mm}:{ss}</div>
                  </div>
                  <div className="h-52 w-52 mx-auto mt-4 rounded-2xl bg-white p-3 grid place-items-center">
                    {pix.qr_code_base64 ? (
                      <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode size={140} strokeWidth={1.2} />
                    )}
                  </div>
                  <button
                    onClick={copyPix}
                    className="mt-4 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
                  >
                    <Copy size={16} /> Copiar código Pix
                  </button>
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="animate-spin" size={14} /> Aguardando pagamento...
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}`}</style>
    </div>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">{n}</span>
        <h2 className="font-semibold">{label}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
