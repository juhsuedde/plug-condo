import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Zap, Plus, ListOrdered, BarChart3, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatusDot, StatusBadge } from "@/components/StatusDot";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/morador/home")({
  component: HomePage,
});

function HomePage() {
  const { perfil } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), []);

  const condoId = perfil?.condominio_id;

  const carregadoresQ = useQuery({
    queryKey: ["carregadores", condoId],
    enabled: !!condoId,
    queryFn: async () => {
      const { data } = await supabase.from("carregadores").select("*").eq("condominio_id", condoId!).order("nome");
      return data || [];
    },
  });

  const reservasQ = useQuery({
    queryKey: ["minhas-reservas", perfil?.id],
    enabled: !!perfil?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("reservas")
        .select("*, carregadores(nome,localizacao)")
        .eq("perfil_id", perfil!.id)
        .order("data", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // realtime carregadores
  useEffect(() => {
    if (!condoId) return;
    const ch = supabase
      .channel("carregadores-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "carregadores" }, () => carregadoresQ.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [condoId, carregadoresQ]);

  const proxima = (reservasQ.data || []).find(
    (r: any) => r.status === "agendada" && parseISO(r.data) >= new Date(new Date().toDateString())
  );

  const recentes = (reservasQ.data || []).slice(0, 3);

  return (
    <div className="px-5 pt-8 pb-6 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">
            {perfil?.nome?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Olá,</p>
            <h1 className="font-bold text-lg leading-tight">{perfil?.nome?.split(" ")[0] ?? "morador"}</h1>
          </div>
        </div>
        <button className="relative h-11 w-11 rounded-full bg-card shadow-soft grid place-items-center">
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-accent" />
        </button>
      </header>

      <section>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {dates.map((d, i) => {
            const active = isSameDay(d, selectedDate);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center min-w-[58px] py-3 rounded-2xl transition ${
                  active ? "bg-primary text-primary-foreground shadow-soft" : "bg-card"
                }`}
              >
                <span className="text-[10px] uppercase font-medium opacity-80">
                  {format(d, "EEE", { locale: ptBR }).slice(0, 3)}
                </span>
                <span className="text-xl font-bold mt-0.5">{format(d, "d")}</span>
              </button>
            );
          })}
        </div>
      </section>

      {proxima && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.55_0.12_180)] text-primary-foreground p-5 shadow-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
              <Clock size={14} /> Próxima reserva
            </div>
            <div className="mt-2 text-2xl font-bold">{(proxima as any).carregadores?.nome}</div>
            <div className="mt-1 text-sm opacity-90">{(proxima as any).carregadores?.localizacao}</div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase opacity-80">Quando</div>
                <div className="font-semibold">
                  {format(parseISO(proxima.data), "dd MMM", { locale: ptBR })} · {(proxima as any).hora_inicio?.slice(0, 5)}
                </div>
              </div>
              <Zap size={32} className="opacity-80" />
            </div>
          </div>
        </motion.section>
      )}

      <section className="grid grid-cols-3 gap-3">
        <QuickAction to="/morador/reservar" icon={Plus} label="Reservar" />
        <QuickAction to="/morador/fila" icon={ListOrdered} label="Fila" />
        <QuickAction to="/morador/perfil" icon={BarChart3} label="Consumo" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Carregadores</h2>
          <span className="text-xs text-muted-foreground">{carregadoresQ.data?.length ?? 0} unidades</span>
        </div>
        <div className="space-y-2.5">
          {(carregadoresQ.data ?? []).map((c: any) => (
            <div key={c.id} className="bg-card rounded-2xl p-4 shadow-soft flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary-soft text-primary grid place-items-center">
                <Zap size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{c.localizacao} · {c.potencia_kw} kW</div>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Atividade recente</h2>
        <div className="space-y-2">
          {recentes.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8 bg-card rounded-2xl">
              Nenhuma reserva ainda. Faça a primeira!
            </div>
          )}
          {recentes.map((r: any) => (
            <div key={r.id} className="bg-card rounded-2xl p-4 shadow-soft flex items-center gap-3">
              <StatusDot status={r.status === "concluida" ? "disponivel" : r.status === "cancelada" ? "manutencao" : "ocupado"} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{r.carregadores?.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(r.data), "dd/MM")} · {r.hora_inicio?.slice(0, 5)}
                </div>
              </div>
              <div className="text-sm font-semibold">{r.custo_total ? brl(r.custo_total) : "—"}</div>
            </div>
          ))}
        </div>
      </section>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}`}</style>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="bg-card rounded-2xl py-4 px-3 shadow-soft flex flex-col items-center gap-2 active:scale-95 transition">
      <div className="h-10 w-10 rounded-2xl bg-primary-soft text-primary grid place-items-center">
        <Icon size={18} />
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  );
}
