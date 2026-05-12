import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Check, X, Phone, Mail, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sindico/moradores")({
  component: Page,
});

type Tab = "pendentes" | "aprovados";

function Page() {
  const { perfil } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pendentes");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const condoId = perfil?.condominio_id;

  const { data = [] } = useQuery({
    queryKey: ["moradores", condoId],
    enabled: !!condoId,
    queryFn: async () =>
      (await supabase.from("perfis").select("*").eq("condominio_id", condoId!).order("created_at", { ascending: false })).data || [],
  });

  const pendentes = data.filter((p: any) => p.role === "morador" && p.status_aprovacao === "pendente");
  const aprovados = data.filter((p: any) => p.status_aprovacao === "aprovado");

  const list = tab === "pendentes"
    ? pendentes
    : aprovados.filter((p: any) =>
        p.nome.toLowerCase().includes(q.toLowerCase()) ||
        (p.unidade ?? "").toLowerCase().includes(q.toLowerCase())
      );

  const updateStatus = async (id: string, status: "aprovado" | "rejeitado", motivo?: string) => {
    setBusyId(id);
    const target = data.find((p: any) => p.id === id);
    const { error } = await supabase
      .from("perfis")
      .update({ status_aprovacao: status, motivo_rejeicao: motivo ?? null })
      .eq("id", id);
    if (!error) {
      await supabase.from("notifications").insert({
        perfil_id: id,
        tipo: "aprovacao",
        titulo: status === "aprovado" ? "Cadastro aprovado!" : "Cadastro rejeitado",
        mensagem: status === "aprovado"
          ? `Olá ${target?.nome?.split(" ")[0] || ""}, seu cadastro foi aprovado pelo síndico. Bem-vindo(a)!`
          : motivo || "Seu cadastro foi rejeitado. Fale com a administração.",
      });
      toast.success(status === "aprovado" ? "Morador aprovado" : "Cadastro rejeitado");
      qc.invalidateQueries({ queryKey: ["moradores", condoId] });
      qc.invalidateQueries({ queryKey: ["pending-count", condoId] });
    } else {
      toast.error(error.message);
    }
    setBusyId(null);
    setRejectingId(null);
    setReason("");
  };

  return (
    <div className="px-5 pt-8 pb-6 space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Moradores</h1>

      <div className="flex gap-2 p-1 bg-muted rounded-2xl">
        <TabBtn active={tab === "pendentes"} onClick={() => setTab("pendentes")}>
          Pendentes {pendentes.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-accent text-accent-foreground">{pendentes.length}</span>}
        </TabBtn>
        <TabBtn active={tab === "aprovados"} onClick={() => setTab("aprovados")}>
          Aprovados <span className="ml-1 text-xs opacity-70">{aprovados.length}</span>
        </TabBtn>
      </div>

      {tab === "aprovados" && (
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou unidade"
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-card shadow-soft outline-none border focus:border-ring text-sm" />
        </div>
      )}

      <div className="space-y-3">
        {list.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            {tab === "pendentes" ? "Nenhuma solicitação pendente." : "Nenhum morador encontrado."}
          </p>
        )}

        {tab === "pendentes" && list.map((p: any) => (
          <div key={p.id} className="bg-card rounded-2xl p-4 shadow-soft space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-accent-soft text-accent grid place-items-center font-bold">
                {p.nome[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.nome}</div>
                <div className="text-xs text-muted-foreground">Unidade {p.unidade ?? "—"}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Mail size={12} /> {p.email}</div>
              {p.telefone && <div className="flex items-center gap-2"><Phone size={12} /> {p.telefone}</div>}
              <div className="flex items-center gap-2"><Calendar size={12} /> Cadastrado em {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>
            </div>

            {rejectingId === p.id ? (
              <div className="space-y-2 pt-1">
                <textarea
                  value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo (opcional)" rows={2}
                  className="w-full p-3 rounded-xl bg-surface-2 text-sm outline-none border focus:border-ring resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setRejectingId(null); setReason(""); }}
                    className="flex-1 h-10 rounded-xl bg-muted text-sm font-semibold">Cancelar</button>
                  <button disabled={busyId === p.id} onClick={() => updateStatus(p.id, "rejeitado", reason || undefined)}
                    className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold flex items-center justify-center">
                    {busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : "Confirmar rejeição"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <button disabled={busyId === p.id} onClick={() => setRejectingId(p.id)}
                  className="flex-1 h-11 rounded-xl bg-destructive/10 text-destructive font-semibold flex items-center justify-center gap-1.5 text-sm">
                  <X size={16} /> Rejeitar
                </button>
                <button disabled={busyId === p.id} onClick={() => updateStatus(p.id, "aprovado")}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5 text-sm">
                  {busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : <><Check size={16} /> Aprovar</>}
                </button>
              </div>
            )}
          </div>
        ))}

        {tab === "aprovados" && list.map((p: any) => (
          <div key={p.id} className="bg-card rounded-2xl p-4 shadow-soft flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary-soft text-primary grid place-items-center font-bold">
              {p.nome[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.nome}</div>
              <div className="text-xs text-muted-foreground truncate">Unid. {p.unidade ?? "—"} · {p.email}</div>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
              p.role === "sindico" ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"
            }`}>{p.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex-1 h-10 rounded-xl text-sm font-semibold transition flex items-center justify-center ${
        active ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"
      }`}>{children}</button>
  );
}
