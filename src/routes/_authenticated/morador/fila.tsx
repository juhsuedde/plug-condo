import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Zap, LogOut, ListOrdered } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusDot";

export const Route = createFileRoute("/_authenticated/morador/fila")({
  component: FilaPage,
});

function FilaPage() {
  const { perfil } = useAuth();
  const qc = useQueryClient();
  const condoId = perfil?.condominio_id;

  const carregadoresQ = useQuery({
    queryKey: ["carregadores", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("carregadores").select("*").eq("condominio_id", condoId!).order("nome")).data || [],
  });

  const filaQ = useQuery({
    queryKey: ["fila", condoId],
    enabled: !!condoId,
    queryFn: async () => {
      const { data } = await supabase
        .from("fila_espera")
        .select("*, carregadores(nome,localizacao)")
        .order("hora_entrada");
      return data || [];
    },
  });

  useEffect(() => {
    if (!condoId) return;
    const ch = supabase
      .channel("fila-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "fila_espera" }, () => filaQ.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "carregadores" }, () => carregadoresQ.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [condoId, filaQ, carregadoresQ]);

  const minhasFilas = (filaQ.data || []).filter((f: any) => f.perfil_id === perfil?.id);

  const entrarNaFila = async (carregadorId: string) => {
    const existing = (filaQ.data || []).filter((f: any) => f.carregador_id === carregadorId);
    const posicao = existing.length + 1;
    const { error } = await supabase.from("fila_espera").insert({
      carregador_id: carregadorId, perfil_id: perfil!.id, posicao,
    });
    if (error) return toast.error(error.message);
    toast.success(`Você entrou na fila — posição ${posicao}`);
  };

  const sairDaFila = async (id: string) => {
    const { error } = await supabase.from("fila_espera").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Você saiu da fila");
    qc.invalidateQueries({ queryKey: ["fila"] });
  };

  return (
    <div className="px-5 pt-8 pb-6 space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Fila de espera</h1>

      {minhasFilas.length > 0 && (
        <section className="space-y-3">
          {minhasFilas.map((f: any) => (
            <motion.div key={f.id} initial={{ scale: 0.96 }} animate={{ scale: 1 }} className="rounded-3xl bg-gradient-to-br from-accent to-[oklch(0.65_0.20_30)] text-accent-foreground p-6 shadow-card text-center">
              <div className="text-xs uppercase tracking-wider opacity-90">Sua posição em</div>
              <div className="font-bold mt-1">{f.carregadores?.nome}</div>
              <div className="text-7xl font-extrabold mt-3">{f.posicao}º</div>
              <div className="text-sm opacity-90 mt-2">Tempo estimado: ~{f.posicao * 30} min</div>
              <button onClick={() => sairDaFila(f.id)} className="mt-5 inline-flex items-center gap-2 bg-accent-foreground/15 px-5 py-2.5 rounded-full font-semibold text-sm">
                <LogOut size={14} /> Sair da fila
              </button>
            </motion.div>
          ))}
        </section>
      )}

      <section className="space-y-2.5">
        <h2 className="font-semibold text-sm text-muted-foreground">Carregadores no condomínio</h2>
        {(carregadoresQ.data || []).map((c: any) => {
          const fila = (filaQ.data || []).filter((f: any) => f.carregador_id === c.id);
          const inQueue = fila.some((f: any) => f.perfil_id === perfil?.id);
          return (
            <div key={c.id} className="bg-card rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary-soft text-primary grid place-items-center"><Zap size={18} /></div>
                <div className="flex-1">
                  <div className="font-semibold">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">{fila.length} na fila</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
              {c.status === "ocupado" && !inQueue && (
                <button onClick={() => entrarNaFila(c.id)} className="mt-3 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-1.5">
                  <ListOrdered size={14} /> Entrar na fila
                </button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
