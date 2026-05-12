import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format, parseISO, isAfter } from "date-fns";
import { Zap, X, Repeat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { brl, kwh } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/morador/reservas")({
  component: ReservasPage,
});

function ReservasPage() {
  const { perfil } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const { data = [] } = useQuery({
    queryKey: ["minhas-reservas-all", perfil?.id],
    enabled: !!perfil?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("reservas").select("*, carregadores(nome,localizacao,potencia_kw)")
        .eq("perfil_id", perfil!.id).order("data", { ascending: false });
      return data || [];
    },
  });

  const today = new Date(new Date().toDateString());
  const upcoming = data.filter((r: any) => isAfter(parseISO(r.data), today) || (r.data === format(today, "yyyy-MM-dd") && r.status !== "concluida" && r.status !== "cancelada"));
  const past = data.filter((r: any) => !upcoming.includes(r));

  const cancelar = async (id: string) => {
    const { error } = await supabase.from("reservas").update({ status: "cancelada" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Reserva cancelada");
    qc.invalidateQueries({ queryKey: ["minhas-reservas-all"] });
    qc.invalidateQueries({ queryKey: ["minhas-reservas"] });
  };

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="px-5 pt-8 pb-6 space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Minhas reservas</h1>

      <div className="bg-surface-2 rounded-full p-1 grid grid-cols-2 text-sm">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`py-2.5 rounded-full font-semibold transition ${tab === t ? "bg-card shadow-soft" : "text-muted-foreground"}`}
          >
            {t === "upcoming" ? "Próximas" : "Anteriores"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12 bg-card rounded-2xl">
            {tab === "upcoming" ? "Sem reservas próximas." : "Sem histórico."}
            <div className="mt-3">
              <Link to="/morador/reservar" className="inline-flex px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Reservar agora</Link>
            </div>
          </div>
        )}
        {list.map((r: any) => (
          <div key={r.id} className="bg-card rounded-2xl p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary-soft text-primary grid place-items-center">
                <Zap size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.carregadores?.nome}</div>
                <div className="text-xs text-muted-foreground">{r.carregadores?.localizacao}</div>
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                r.status === "agendada" ? "bg-primary-soft text-primary" :
                r.status === "concluida" ? "bg-success/15 text-success" :
                r.status === "cancelada" ? "bg-muted text-muted-foreground" : "bg-accent/15 text-accent"
              }`}>{r.status}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>{format(parseISO(r.data), "dd/MM/yyyy")} · {r.hora_inicio.slice(0,5)}–{r.hora_fim.slice(0,5)}</span>
              {r.kwh_consumido && <span className="text-muted-foreground">{kwh(Number(r.kwh_consumido))}</span>}
              {r.custo_total && <span className="font-semibold">{brl(Number(r.custo_total))}</span>}
            </div>
            {tab === "upcoming" && r.status === "agendada" && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Cancelamento gratuito até 1h antes</span>
                <button onClick={() => cancelar(r.id)} className="inline-flex items-center gap-1 text-destructive font-semibold text-sm">
                  <X size={14} /> Cancelar
                </button>
              </div>
            )}
            {tab === "past" && (
              <Link to="/morador/reservar" className="mt-3 inline-flex items-center gap-1 text-primary font-semibold text-sm">
                <Repeat size={14} /> Reservar novamente
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
