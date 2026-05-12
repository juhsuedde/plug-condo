import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format, subHours } from "date-fns";
import { Activity, AlertTriangle, Zap } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sindico/energia")({
  component: Page,
});

function Page() {
  const { perfil } = useAuth();
  const condoId = perfil?.condominio_id;

  const condoQ = useQuery({
    queryKey: ["condo-energia", condoId],
    enabled: !!condoId,
    refetchInterval: 15000,
    queryFn: async () => (await supabase.from("condominios").select("*").eq("id", condoId!).single()).data,
  });

  const carregadoresQ = useQuery({
    queryKey: ["carregadores-energia", condoId],
    enabled: !!condoId,
    refetchInterval: 15000,
    queryFn: async () => (await supabase.from("carregadores").select("*").eq("condominio_id", condoId!)).data || [],
  });

  const reservasQ = useQuery({
    queryKey: ["reservas-energia", condoId],
    enabled: !!condoId,
    refetchInterval: 15000,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      return (await supabase.from("reservas").select("*").gte("data", today)).data || [];
    },
  });

  const demandaContratada = Number((condoQ.data as any)?.demanda_contratada_kw ?? 75);
  const carregadores = carregadoresQ.data ?? [];
  const reservas = reservasQ.data ?? [];

  const ativas = reservas.filter((r: any) => r.status === "ativa");
  const inUseIds = new Set(ativas.map((r: any) => r.carregador_id));
  const consumoAtual = carregadores
    .filter((c: any) => inUseIds.has(c.id))
    .reduce((s: number, c: any) => s + Number(c.potencia_kw), 0);

  const pct = Math.min(100, Math.round((consumoAtual / demandaContratada) * 100));
  const tone = pct >= 90 ? "destructive" : pct >= 70 ? "warning" : "success";
  const toneLabel = pct >= 90 ? "Crítico" : pct >= 70 ? "Atenção" : "Normal";

  const series = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const h = subHours(new Date(), 11 - i);
      const noise = (Math.sin(i / 1.6) + 1) / 2;
      const base = consumoAtual * (0.4 + noise * 0.7);
      return { t: format(h, "HH:00"), kw: Number(base.toFixed(1)) };
    });
  }, [consumoAtual]);

  const toneClasses = {
    success: { bg: "bg-success/10", border: "border-success/30", chip: "bg-success text-success-foreground", solid: "bg-success" },
    warning: { bg: "bg-warning/10", border: "border-warning/30", chip: "bg-warning text-warning-foreground", solid: "bg-warning" },
    destructive: { bg: "bg-destructive/10", border: "border-destructive/30", chip: "bg-destructive text-destructive-foreground", solid: "bg-destructive" },
  }[tone];

  return (
    <div className="px-5 pt-6 pb-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-primary font-bold">Tempo real</p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">Monitor de energia</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-surface-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Ao vivo
        </span>
      </header>

      <section className={`rounded-3xl p-6 shadow-card ${toneClasses.bg} border ${toneClasses.border}`}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Demanda atual</div>
            <div className="text-4xl font-extrabold mt-1">{consumoAtual.toFixed(1)} <span className="text-base text-muted-foreground">kW</span></div>
            <div className="text-xs text-muted-foreground mt-0.5">de {demandaContratada} kW contratados</div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${toneClasses.chip}`}>{toneLabel}</span>
        </div>
        <div className="mt-4 h-3 rounded-full bg-card overflow-hidden">
          <div className={`h-full ${toneClasses.solid} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[11px] text-muted-foreground mt-1.5">{pct}% da capacidade contratada</div>
      </section>

      {pct >= 90 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
          <AlertTriangle className="text-destructive mt-0.5" size={20} />
          <div className="text-sm">
            <div className="font-semibold">Demanda próxima do limite</div>
            <div className="text-xs text-muted-foreground">Risco de multa por ultrapassagem. Considere escalonar reservas.</div>
          </div>
        </div>
      )}

      <section className="bg-card rounded-3xl p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-primary" />
          <h2 className="font-bold">Consumo · últimas 12h</h2>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis hide domain={[0, demandaContratada]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }} />
              <ReferenceLine y={demandaContratada} stroke="var(--destructive)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="kw" stroke="var(--primary)" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-card rounded-3xl p-5 shadow-soft">
        <h2 className="font-bold mb-3">Por ponto</h2>
        <ul className="space-y-2">
          {carregadores.map((c: any) => {
            const ativo = inUseIds.has(c.id);
            return (
              <li key={c.id} className="flex items-center gap-3">
                <Zap size={16} className={ativo ? "text-success" : "text-muted-foreground"} />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{c.nome}</div>
                  <div className="text-[11px] text-muted-foreground">{c.localizacao} · {c.tipo}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{ativo ? `${Number(c.potencia_kw).toFixed(1)} kW` : "—"}</div>
                  <div className={`text-[10px] uppercase font-bold ${ativo ? "text-success" : "text-muted-foreground"}`}>
                    {ativo ? "Ativo" : "Idle"}
                  </div>
                </div>
              </li>
            );
          })}
          {carregadores.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum ponto cadastrado.</p>}
        </ul>
      </section>
    </div>
  );
}
