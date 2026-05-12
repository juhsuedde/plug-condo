import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plug, DollarSign, FileCheck2, Users, Check, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sindico/onboarding")({
  component: Wizard,
});

const steps = [
  { key: "info", label: "Prédio", icon: Building2 },
  { key: "spots", label: "Pontos", icon: Plug },
  { key: "pricing", label: "Preços", icon: DollarSign },
  { key: "docs", label: "Conformidade", icon: FileCheck2 },
  { key: "invite", label: "Convidar", icon: Users },
] as const;

function Wizard() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const condoId = perfil?.condominio_id;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const condoQ = useQuery({
    queryKey: ["condo-onb", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("condominios").select("*").eq("id", condoId!).single()).data,
  });
  const carregadoresQ = useQuery({
    queryKey: ["carregadores-onb", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("carregadores").select("*").eq("condominio_id", condoId!)).data || [],
  });

  const [info, setInfo] = useState({ nome: "", endereco: "", cnpj: "", qtd_unidades: "0", demanda_contratada_kw: "75" });
  const [pricing, setPricing] = useState({ preco_kwh: "0.95", taxa_uso: "5.00" });
  const [compliance, setCompliance] = useState<any>({});
  const [newSpot, setNewSpot] = useState({ nome: "", localizacao: "", potencia_kw: "7.4", tipo: "compartilhado" as "compartilhado" | "privativo", tipo_cobranca: "kwh" as "kwh" | "hora" });

  useEffect(() => {
    const c = condoQ.data;
    if (!c) return;
    setInfo({
      nome: c.nome ?? "", endereco: c.endereco ?? "", cnpj: c.cnpj ?? "",
      qtd_unidades: String(c.qtd_unidades ?? 0),
      demanda_contratada_kw: String((c as any).demanda_contratada_kw ?? 75),
    });
    setPricing({ preco_kwh: String(c.preco_kwh ?? "0.95"), taxa_uso: String(c.taxa_uso ?? "5.00") });
    setCompliance((c as any).compliance ?? {});
  }, [condoQ.data]);

  const saveInfo = async () => {
    if (!condoId) return;
    setSaving(true);
    const { error } = await supabase.from("condominios").update({
      nome: info.nome, endereco: info.endereco, cnpj: info.cnpj,
      qtd_unidades: Number(info.qtd_unidades),
      demanda_contratada_kw: Number(info.demanda_contratada_kw),
    } as any).eq("id", condoId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Dados salvos");
    setStep(1);
  };

  const addSpot = async () => {
    if (!condoId || !newSpot.nome) return toast.error("Informe o nome do ponto");
    const { error } = await supabase.from("carregadores").insert({
      condominio_id: condoId,
      nome: newSpot.nome,
      localizacao: newSpot.localizacao || "Garagem",
      potencia_kw: Number(newSpot.potencia_kw),
      tipo: newSpot.tipo,
      tipo_cobranca: newSpot.tipo_cobranca,
      status: "disponivel",
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Ponto adicionado");
    setNewSpot({ ...newSpot, nome: "", localizacao: "" });
    qc.invalidateQueries({ queryKey: ["carregadores-onb", condoId] });
  };

  const removeSpot = async (id: string) => {
    const { error } = await supabase.from("carregadores").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["carregadores-onb", condoId] });
  };

  const savePricing = async () => {
    if (!condoId) return;
    setSaving(true);
    const { error } = await supabase.from("condominios").update({
      preco_kwh: Number(pricing.preco_kwh),
      taxa_uso: Number(pricing.taxa_uso),
    }).eq("id", condoId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Preços salvos");
    setStep(3);
  };

  const saveDocs = async () => {
    if (!condoId) return;
    setSaving(true);
    const { error } = await supabase.from("condominios").update({ compliance } as any).eq("id", condoId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Conformidade atualizada");
    setStep(4);
  };

  const finish = async () => {
    if (!condoId) return;
    setSaving(true);
    const { error } = await supabase.from("condominios").update({ onboarding_completo: true } as any).eq("id", condoId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Onboarding concluído!");
    qc.invalidateQueries();
    navigate({ to: "/sindico/dashboard" });
  };

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/register` : "/register";
  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copiado");
  };

  if (condoQ.isLoading) return <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="px-5 pt-6 pb-24 space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-primary font-bold">Configuração inicial</p>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1">Vamos preparar seu condomínio</h1>
        <p className="text-sm text-muted-foreground mt-1">5 passos para liberar o app aos moradores.</p>
      </header>

      <ol className="grid grid-cols-5 gap-1.5">
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex flex-col items-center gap-1">
              <div className={`h-9 w-9 rounded-full grid place-items-center text-xs font-bold ${
                done ? "bg-success/20 text-success" : active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
              }`}>
                {done ? <Check size={16} /> : <Icon size={14} />}
              </div>
              <span className={`text-[10px] text-center ${active ? "text-primary font-bold" : "text-muted-foreground"}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="bg-card rounded-3xl p-5 shadow-soft space-y-4">
        {step === 0 && (
          <>
            <h2 className="font-bold">Informações do prédio</h2>
            <Field label="Nome do condomínio" v={info.nome} on={(v) => setInfo({ ...info, nome: v })} />
            <Field label="Endereço" v={info.endereco} on={(v) => setInfo({ ...info, endereco: v })} />
            <Field label="CNPJ" v={info.cnpj} on={(v) => setInfo({ ...info, cnpj: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unidades" v={info.qtd_unidades} on={(v) => setInfo({ ...info, qtd_unidades: v })} type="number" />
              <Field label="Demanda contratada (kW)" v={info.demanda_contratada_kw} on={(v) => setInfo({ ...info, demanda_contratada_kw: v })} type="number" />
            </div>
            <Next onClick={saveInfo} loading={saving} />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-bold">Pontos de recarga</h2>
            <p className="text-xs text-muted-foreground -mt-2">Cadastre os pontos compartilhados ou privativos do condomínio.</p>
            <div className="space-y-2">
              {(carregadoresQ.data || []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between bg-surface-2 rounded-xl px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold">{c.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{c.localizacao} · {c.potencia_kw}kW · {c.tipo} · {c.tipo_cobranca}</div>
                  </div>
                  <button onClick={() => removeSpot(c.id)} className="text-destructive p-2"><Trash2 size={14} /></button>
                </div>
              ))}
              {(carregadoresQ.data || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum ponto cadastrado.</p>}
            </div>
            <div className="bg-surface-2 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Nome (ex: Plug A)" v={newSpot.nome} on={(v) => setNewSpot({ ...newSpot, nome: v })} />
                <Field label="Localização" v={newSpot.localizacao} on={(v) => setNewSpot({ ...newSpot, localizacao: v })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Potência kW" v={newSpot.potencia_kw} on={(v) => setNewSpot({ ...newSpot, potencia_kw: v })} type="number" />
                <Select label="Tipo" v={newSpot.tipo} on={(v) => setNewSpot({ ...newSpot, tipo: v as any })} opts={[["compartilhado","Compart."],["privativo","Privat."]]} />
                <Select label="Cobrança" v={newSpot.tipo_cobranca} on={(v) => setNewSpot({ ...newSpot, tipo_cobranca: v as any })} opts={[["kwh","kWh"],["hora","Hora"]]} />
              </div>
              <button onClick={addSpot} className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2">
                <Plus size={14} /> Adicionar ponto
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="h-12 px-4 rounded-2xl bg-surface-2 text-sm font-semibold">Voltar</button>
              <button onClick={() => setStep(2)} className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2">
                Continuar <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-bold">Regras de preço</h2>
            <Field label="Preço por kWh (R$)" v={pricing.preco_kwh} on={(v) => setPricing({ ...pricing, preco_kwh: v })} type="number" />
            <Field label="Taxa de uso fixa (R$)" v={pricing.taxa_uso} on={(v) => setPricing({ ...pricing, taxa_uso: v })} type="number" />
            <p className="text-xs text-muted-foreground">A cobrança por hora pode ser definida individualmente em cada ponto na etapa anterior.</p>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="h-12 px-4 rounded-2xl bg-surface-2 text-sm font-semibold">Voltar</button>
              <Next onClick={savePricing} loading={saving} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-bold">Documentos de conformidade</h2>
            <p className="text-xs text-muted-foreground -mt-2">Marque os documentos que já foram providenciados.</p>
            {[
              ["doc_save", "SAVE — Sistema Anti-Vazamento Elétrico"],
              ["doc_art", "ART — Anotação de Responsabilidade Técnica"],
              ["doc_nbr17019", "Laudo NBR 17019/2022"],
              ["botao_emergencia", "Botão de emergência instalado"],
              ["deteccao_incendio", "Detecção de incêndio na garagem"],
              ["sinalizacao", "Sinalização do ponto de recarga"],
              ["capacidade_eletrica", "Capacidade elétrica adequada"],
              ["medicao_individual", "Medição individual por ponto"],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 py-1.5 cursor-pointer">
                <input type="checkbox" className="h-5 w-5 accent-primary"
                  checked={!!compliance[k as string]}
                  onChange={(e) => setCompliance({ ...compliance, [k as string]: e.target.checked })} />
                <span className="text-sm">{label}</span>
              </label>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="h-12 px-4 rounded-2xl bg-surface-2 text-sm font-semibold">Voltar</button>
              <Next onClick={saveDocs} loading={saving} />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-bold">Convidar moradores</h2>
            <p className="text-sm text-muted-foreground">Compartilhe o link de cadastro. Cada novo morador entra como pendente e aguarda sua aprovação.</p>
            <div className="bg-surface-2 rounded-xl p-3 text-xs break-all font-mono">{inviteUrl}</div>
            <button onClick={copyInvite} className="w-full h-11 rounded-2xl bg-card border font-semibold text-sm">Copiar link</button>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep(3)} className="h-12 px-4 rounded-2xl bg-surface-2 text-sm font-semibold">Voltar</button>
              <button onClick={finish} disabled={saving} className="flex-1 h-12 rounded-2xl bg-success text-success-foreground font-semibold inline-flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Concluir e liberar app
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <input value={v} onChange={(e) => on(e.target.value)} type={type}
        className="mt-1 w-full h-11 px-3 rounded-xl bg-surface-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
    </label>
  );
}
function Select({ label, v, on, opts }: { label: string; v: string; on: (v: string) => void; opts: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <select value={v} onChange={(e) => on(e.target.value)}
        className="mt-1 w-full h-11 px-2 rounded-xl bg-surface-2 outline-none focus:ring-2 focus:ring-primary text-sm">
        {opts.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
    </label>
  );
}
function Next({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2">
      {loading ? <Loader2 className="animate-spin" size={16} /> : <>Continuar <ChevronRight size={16} /></>}
    </button>
  );
}
