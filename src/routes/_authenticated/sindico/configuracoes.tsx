import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/sindico/configuracoes")({
  component: ConfigPage,
});

const schema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  endereco: z.string().trim().min(2, "Endereço obrigatório").max(200),
  cnpj: z.string().trim().max(20).optional().or(z.literal("")),
  preco_kwh: z.coerce.number().min(0).max(99),
  taxa_uso: z.coerce.number().min(0).max(999),
  qtd_unidades: z.coerce.number().int().min(0).max(99999),
  horario_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  horario_fim: z.string().regex(/^\d{2}:\d{2}$/),
  duracao_padrao_horas: z.coerce.number().int().min(1).max(8),
  limite_reservas_futuras: z.coerce.number().int().min(1).max(20),
});

const maskCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

function ConfigPage() {
  const { perfil } = useAuth();
  const condoId = perfil?.condominio_id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "", endereco: "", cnpj: "",
    preco_kwh: "0.95", taxa_uso: "5.00", qtd_unidades: "0",
    horario_inicio: "07:00", horario_fim: "23:00",
    duracao_padrao_horas: "2", limite_reservas_futuras: "2",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["condo-config", condoId],
    enabled: !!condoId,
    queryFn: async () => {
      const { data } = await supabase.from("condominios").select("*").eq("id", condoId!).single();
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      nome: data.nome ?? "",
      endereco: data.endereco ?? "",
      cnpj: data.cnpj ?? "",
      preco_kwh: String(data.preco_kwh ?? "0.95"),
      taxa_uso: String(data.taxa_uso ?? "5.00"),
      qtd_unidades: String(data.qtd_unidades ?? 0),
      horario_inicio: (data as any).horario_inicio?.slice(0, 5) ?? "07:00",
      horario_fim: (data as any).horario_fim?.slice(0, 5) ?? "23:00",
      duracao_padrao_horas: String((data as any).duracao_padrao_horas ?? 2),
      limite_reservas_futuras: String((data as any).limite_reservas_futuras ?? 2),
    });
  }, [data]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!condoId) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("condominios")
      .update(parsed.data as any)
      .eq("id", condoId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configurações salvas");
  };

  if (isLoading) {
    return <div className="p-10 grid place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="px-5 pt-6 pb-8 space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Configurações do Condomínio</h1>
        <p className="text-sm text-muted-foreground mt-1">Ajuste dados gerais, tarifas e regras de reserva.</p>
      </header>

      <section className="bg-card rounded-3xl shadow-card p-5 space-y-4">
        <h2 className="font-bold">Dados gerais</h2>
        <Field label="Nome do Condomínio">
          <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
        </Field>
        <Field label="Endereço">
          <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
        </Field>
        <Field label="CNPJ">
          <Input value={form.cnpj} onChange={(e) => set("cnpj", maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
        </Field>
        <Field label="Quantidade de Unidades">
          <Input type="number" min={0} value={form.qtd_unidades} onChange={(e) => set("qtd_unidades", e.target.value)} />
        </Field>
      </section>

      <section className="bg-card rounded-3xl shadow-card p-5 space-y-4">
        <h2 className="font-bold">Tarifas</h2>
        <Field label="Preço do kWh">
          <PrefixInput prefix="R$" type="number" step="0.01" min={0}
            value={form.preco_kwh} onChange={(e) => set("preco_kwh", e.target.value)} />
        </Field>
        <Field label="Taxa de Uso">
          <PrefixInput prefix="R$" type="number" step="0.01" min={0}
            value={form.taxa_uso} onChange={(e) => set("taxa_uso", e.target.value)} />
        </Field>
      </section>

      <section className="bg-card rounded-3xl shadow-card p-5 space-y-4">
        <h2 className="font-bold">Regras de reserva</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início">
            <Input type="time" value={form.horario_inicio} onChange={(e) => set("horario_inicio", e.target.value)} />
          </Field>
          <Field label="Término">
            <Input type="time" value={form.horario_fim} onChange={(e) => set("horario_fim", e.target.value)} />
          </Field>
        </div>
        <Field label="Duração padrão da reserva">
          <select
            value={form.duracao_padrao_horas}
            onChange={(e) => set("duracao_padrao_horas", e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="1">1 hora</option>
            <option value="2">2 horas</option>
            <option value="3">3 horas</option>
          </select>
        </Field>
        <Field label="Limite de reservas futuras por morador">
          <Input type="number" min={1} max={20} value={form.limite_reservas_futuras}
            onChange={(e) => set("limite_reservas_futuras", e.target.value)} />
        </Field>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-soft disabled:opacity-70"
      >
        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PrefixInput({ prefix, ...props }: { prefix: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center rounded-md border border-input bg-transparent shadow-sm h-9 overflow-hidden">
      <span className="px-3 text-sm text-muted-foreground bg-muted h-full grid place-items-center">{prefix}</span>
      <input {...props} className="flex-1 bg-transparent px-3 text-sm outline-none h-full" />
    </div>
  );
}
