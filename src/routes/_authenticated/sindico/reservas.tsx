import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sindico/reservas")({
  component: Page,
});

function Page() {
  const { perfil } = useAuth();
  const qc = useQueryClient();
  const condoId = perfil?.condominio_id;
  const [day, setDay] = useState(new Date());
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 3)), []);

  const carregadoresQ = useQuery({
    queryKey: ["carregadores", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("carregadores").select("id").eq("condominio_id", condoId!)).data || [],
  });

  const ids = (carregadoresQ.data || []).map((c: any) => c.id);

  const { data = [] } = useQuery({
    queryKey: ["all-reservas", condoId, format(day, "yyyy-MM-dd")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("reservas")
        .select("*, carregadores(nome), perfis(nome,unidade)")
        .in("carregador_id", ids)
        .eq("data", format(day, "yyyy-MM-dd"))
        .order("hora_inicio");
      return data || [];
    },
  });

  const cancelar = async (id: string) => {
    await supabase.from("reservas").update({ status: "cancelada" }).eq("id", id);
    toast.success("Reserva cancelada");
    qc.invalidateQueries({ queryKey: ["all-reservas"] });
  };

  return (
    <div className="px-5 pt-8 pb-6 space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Reservas</h1>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
        {days.map((d, i) => {
          const active = isSameDay(d, day);
          return (
            <button key={i} onClick={() => setDay(d)}
              className={`min-w-[58px] py-3 rounded-2xl flex flex-col items-center transition ${active ? "bg-primary text-primary-foreground" : "bg-card"}`}>
              <span className="text-[10px] uppercase opacity-80">{format(d, "EEE", { locale: ptBR }).slice(0, 3)}</span>
              <span className="text-xl font-bold">{format(d, "d")}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {data.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Sem reservas neste dia.</p>}
        {data.map((r: any) => (
          <div key={r.id} className="bg-card rounded-2xl p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{r.carregadores?.nome}</div>
                <div className="text-xs text-muted-foreground">{r.perfis?.nome} · Unid. {r.perfis?.unidade}</div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                r.status === "agendada" ? "bg-primary-soft text-primary" :
                r.status === "concluida" ? "bg-success/15 text-success" :
                r.status === "cancelada" ? "bg-muted text-muted-foreground" : "bg-accent/15 text-accent"
              }`}>{r.status}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>{r.hora_inicio.slice(0, 5)} – {r.hora_fim.slice(0, 5)}</span>
              {r.status === "agendada" && (
                <button onClick={() => cancelar(r.id)} className="text-destructive font-semibold inline-flex items-center gap-1">
                  <X size={14} /> Cancelar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}`}</style>
    </div>
  );
}
