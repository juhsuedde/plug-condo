import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Zap, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusDot";

export const Route = createFileRoute("/_authenticated/sindico/carregadores")({
  component: Page,
});

type Status = "disponivel" | "ocupado" | "manutencao";

function Page() {
  const { perfil } = useAuth();
  const qc = useQueryClient();
  const condoId = perfil?.condominio_id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["carregadores", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("carregadores").select("*").eq("condominio_id", condoId!).order("nome")).data || [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["carregadores"] });

  return (
    <div className="px-5 pt-8 pb-24 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Carregadores</h1>
        <span className="text-xs text-muted-foreground">{data.length} unidades</span>
      </header>

      <div className="space-y-2.5">
        {data.map((c: any) => (
          <button key={c.id} onClick={() => setEditing(c)} className="w-full text-left bg-card rounded-2xl p-4 shadow-soft flex items-center gap-3 active:scale-[0.99] transition">
            <div className="h-11 w-11 rounded-2xl bg-primary-soft text-primary grid place-items-center"><Zap size={18} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{c.nome}</div>
              <div className="text-xs text-muted-foreground">{c.localizacao} · {c.potencia_kw} kW</div>
            </div>
            <StatusBadge status={c.status} />
          </button>
        ))}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-1/2 translate-x-[193px] md:translate-x-[193px] z-20 h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-pop grid place-items-center active:scale-95 transition"
        style={{ right: "max(1.25rem, calc(50% - 215px + 1.25rem))" }}
      >
        <Plus size={22} />
      </button>

      <Sheet open={open || !!editing} onClose={() => { setOpen(false); setEditing(null); }}>
        <ChargerForm
          initial={editing}
          condoId={condoId!}
          onDone={() => { setOpen(false); setEditing(null); refresh(); }}
          onDelete={editing ? async () => {
            await supabase.from("carregadores").delete().eq("id", editing.id);
            toast.success("Removido");
            setEditing(null); refresh();
          } : undefined}
        />
      </Sheet>
    </div>
  );
}

function ChargerForm({ initial, condoId, onDone, onDelete }: { initial: any; condoId: string; onDone: () => void; onDelete?: () => void }) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    localizacao: initial?.localizacao ?? "",
    potencia_kw: initial?.potencia_kw ?? 7.4,
    status: (initial?.status ?? "disponivel") as Status,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (initial) {
      await supabase.from("carregadores").update(form).eq("id", initial.id);
    } else {
      await supabase.from("carregadores").insert({ ...form, condominio_id: condoId });
    }
    setSaving(false);
    toast.success(initial ? "Atualizado" : "Carregador criado");
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-xl font-bold">{initial ? "Editar" : "Novo"} carregador</h2>
      <input className="input" required placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      <input className="input" required placeholder="Localização" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} />
      <input className="input" required type="number" step="0.1" placeholder="Potência (kW)" value={form.potencia_kw} onChange={(e) => setForm({ ...form, potencia_kw: parseFloat(e.target.value) })} />
      <div className="grid grid-cols-3 gap-2">
        {(["disponivel", "ocupado", "manutencao"] as Status[]).map((s) => (
          <button key={s} type="button" onClick={() => setForm({ ...form, status: s })}
            className={`py-2.5 rounded-xl text-xs font-semibold capitalize ${form.status === s ? "bg-primary text-primary-foreground" : "bg-surface-2"}`}>
            {s}
          </button>
        ))}
      </div>
      <button disabled={saving} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold mt-2 disabled:opacity-60">
        {saving ? "Salvando..." : "Salvar"}
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="w-full h-12 rounded-2xl bg-card text-destructive font-semibold border">Excluir</button>
      )}
      <style>{`
        .input { width:100%; height:48px; border-radius:14px; background:var(--surface-2); border:1px solid var(--input); padding:0 14px; outline:none; }
        .input:focus { border-color:var(--ring); }
      `}</style>
    </form>
  );
}

function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 bg-black/40 flex items-end justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="bg-card w-full max-w-[430px] rounded-t-[28px] p-6 pb-8 shadow-pop">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-muted mb-4" />
            <button onClick={onClose} className="absolute top-4 right-4 h-9 w-9 rounded-full bg-surface-2 grid place-items-center"><X size={16} /></button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
