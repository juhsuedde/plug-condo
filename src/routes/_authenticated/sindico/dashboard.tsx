import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, Zap, ListOrdered, AlertTriangle, Activity, Shield, Sparkles, ChevronRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sindico/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { perfil } = useAuth();
  const condoId = perfil?.condominio_id;
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const txQ = useQuery({
    queryKey: ["tx-month", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("transacoes").select("*").gte("created_at", monthStart)).data || [],
  });
  const reservasQ = useQuery({
    queryKey: ["reservas-7d", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("reservas").select("*").gte("data", format(subDays(new Date(), 7), "yyyy-MM-dd"))).data || [],
  });
  const carregadoresQ = useQuery({
    queryKey: ["carregadores", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("carregadores").select("*").eq("condominio_id", condoId!)).data || [],
  });
  const filaQ = useQuery({
    queryKey: ["fila-count", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("fila_espera").select("*")).data || [],
  });
  const condoQ = useQuery({
    queryKey: ["condo-dashboard", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("condominios").select("*").eq("id", condoId!).single()).data,
  });

  const revenue = (txQ.data || []).filter((t: any) => t.status_pagamento === "pago").reduce((s: number, t: any) => s + Number(t.valor_total), 0);
  const totalKwh = (reservasQ.data || []).reduce((s: number, r: any) => s + Number(r.kwh_consumido || 0), 0);
  const todayCount = (reservasQ.data || []).filter((r: any) => r.data === todayStr && r.status !== "cancelada").length;
  const queueSize = (filaQ.data || []).length;
  const maintenance = (carregadoresQ.data || []).filter((c: any) => c.status === "manutencao");
  const ativasNow = (reservasQ.data || []).filter((r: any) => r.status === "ativa");
  const inUseIds = new Set(ativasNow.map((r: any) => r.carregador_id));
  const consumoAtual = (carregadoresQ.data || []).filter((c: any) => inUseIds.has(c.id)).reduce((s: number, c: any) => s + Number(c.potencia_kw), 0);
  const demandaContratada = Number((condoQ.data as any)?.demanda_contratada_kw ?? 75);
  const demandaPct = Math.min(100, Math.round((consumoAtual / demandaContratada) * 100));
  const compliance = (condoQ.data as any)?.compliance ?? {};
  const complianceItems = ["botao_emergencia","deteccao_incendio","sinalizacao","capacidade_eletrica","medicao_individual","doc_save","doc_art","doc_nbr17019"];
  const complianceScore = Math.round(complianceItems.filter((k) => compliance[k]).length / complianceItems.length * 100);
  const onboardingPending = condoQ.data && !(condoQ.data as any).onboarding_completo;

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const count = (reservasQ.data || []).filter((r: any) => r.data === d).length;
    return { day: format(subDays(new Date(), 6 - i), "EEE", { locale: ptBR }).slice(0, 3), count };
  });

  return (
    <div className="px-5 pt-8 pb-6 space-y-5">
      <header>
        <p className="text-xs text-muted-foreground">Olá, síndico</p>
        <h1 className="text-2xl font-extrabold tracking-tight">{perfil?.nome?.split(" ")[0]}</h1>
      </header>

      {onboardingPending && (
        <Link to="/sindico/onboarding"
          className="block rounded-3xl p-5 bg-gradient-to-br from-primary to-[oklch(0.55_0.12_180)] text-primary-foreground shadow-card">
          <div className="flex items-center gap-3">
            <Sparkles size={22} />
            <div className="flex-1">
              <div className="font-bold">Configure seu condomínio</div>
              <div className="text-xs opacity-90">O app só libera para os moradores depois.</div>
            </div>
            <ChevronRight size={18} />
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<TrendingUp size={16} />} label="Receita do mês" value={brl(revenue)} accent />
        <Stat icon={<Zap size={16} />} label="kWh do mês" value={`${totalKwh.toFixed(1)}`} />
        <Stat icon={<Zap size={16} />} label="Reservas hoje" value={String(todayCount)} />
        <Stat icon={<ListOrdered size={16} />} label="Na fila" value={String(queueSize)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/sindico/energia" className="rounded-2xl p-4 shadow-soft bg-card block">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Activity size={14} /> Demanda agora</div>
          <div className="font-extrabold text-xl mt-2">{consumoAtual.toFixed(1)} kW</div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className={`h-full ${demandaPct >= 90 ? "bg-destructive" : demandaPct >= 70 ? "bg-warning" : "bg-success"}`} style={{ width: `${demandaPct}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">{demandaPct}% de {demandaContratada}kW</div>
        </Link>
        <Link to="/sindico/compliance" className="rounded-2xl p-4 shadow-soft bg-card block">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Shield size={14} /> Conformidade</div>
          <div className="font-extrabold text-xl mt-2">{complianceScore}<span className="text-sm text-muted-foreground">/100</span></div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className={`h-full ${complianceScore >= 85 ? "bg-success" : complianceScore >= 60 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${complianceScore}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">SAVE & Lei 18.403</div>
        </Link>
      </div>

      <section className="bg-card rounded-2xl p-5 shadow-soft">
        <div className="font-semibold mb-2">Ocupação · 7 dias</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill="var(--primary)" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {maintenance.length > 0 && (
        <div className="bg-warning/15 border border-warning/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-warning" size={20} />
          <div className="text-sm">
            <div className="font-semibold">{maintenance.length} carregador(es) em manutenção</div>
            <div className="text-muted-foreground text-xs">Verifique o status na aba Plugs.</div>
          </div>
        </div>
      )}

      <section className="bg-card rounded-2xl p-5 shadow-soft">
        <div className="font-semibold mb-3">Transações recentes</div>
        <div className="space-y-2">
          {(txQ.data || []).slice(0, 5).map((t: any) => (
            <div key={t.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{format(parseISO(t.created_at), "dd/MM HH:mm")}</span>
              <span className="font-semibold">{brl(Number(t.valor_total))}</span>
            </div>
          ))}
          {(txQ.data || []).length === 0 && <p className="text-sm text-muted-foreground">Sem transações ainda.</p>}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-soft ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <div className={`flex items-center gap-1.5 text-xs ${accent ? "opacity-90" : "text-muted-foreground"}`}>
        {icon} {label}
      </div>
      <div className="font-extrabold text-xl mt-2">{value}</div>
    </div>
  );
}
