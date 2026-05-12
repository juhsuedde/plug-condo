import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, parseISO, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { brl } from "@/lib/format";

type Period = "week" | "month" | "year";

export const Route = createFileRoute("/_authenticated/sindico/financeiro")({
  component: Page,
});

function Page() {
  const { perfil } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const condoId = perfil?.condominio_id;

  const start = useMemo(() => {
    const now = new Date();
    if (period === "week") return startOfWeek(now, { weekStartsOn: 1 });
    if (period === "year") return startOfYear(now);
    return startOfMonth(now);
  }, [period]);

  const { data = [] } = useQuery({
    queryKey: ["finance", condoId, period],
    enabled: !!condoId,
    queryFn: async () => {
      const { data } = await supabase
        .from("transacoes")
        .select("*, perfis(nome,unidade,condominio_id)")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false });
      return (data || []).filter((t: any) => t.perfis?.condominio_id === condoId);
    },
  });

  const total = data.filter((t: any) => t.status_pagamento === "pago").reduce((s: number, t: any) => s + Number(t.valor_total), 0);
  const energy = data.filter((t: any) => t.status_pagamento === "pago").reduce((s: number, t: any) => s + Number(t.valor_energia), 0);
  const fees = data.filter((t: any) => t.status_pagamento === "pago").reduce((s: number, t: any) => s + Number(t.valor_taxa), 0);

  const exportCsv = () => {
    const rows = [["Data", "Morador", "Unidade", "Energia", "Taxa", "Total", "Status"]];
    data.forEach((t: any) => rows.push([
      format(parseISO(t.created_at), "dd/MM/yyyy HH:mm"),
      t.perfis?.nome ?? "—", t.perfis?.unidade ?? "—",
      String(t.valor_energia), String(t.valor_taxa), String(t.valor_total), t.status_pagamento,
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `plug-condo-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  return (
    <div className="px-5 pt-8 pb-6 space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Financeiro</h1>

      <div className="bg-surface-2 rounded-full p-1 grid grid-cols-3 text-sm">
        {(["week", "month", "year"] as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`py-2.5 rounded-full font-semibold capitalize ${period === p ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
            {p === "week" ? "Semana" : p === "month" ? "Mês" : "Ano"}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.55_0.12_180)] text-primary-foreground p-6 shadow-card">
        <div className="text-xs uppercase opacity-90">Receita do período</div>
        <div className="text-4xl font-extrabold mt-2">{brl(total)}</div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div className="bg-white/10 rounded-2xl p-3">
            <div className="opacity-80 text-[11px]">Energia</div>
            <div className="font-bold">{brl(energy)}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <div className="opacity-80 text-[11px]">Taxas</div>
            <div className="font-bold">{brl(fees)}</div>
          </div>
        </div>
      </div>

      <button onClick={exportCsv} className="w-full h-12 rounded-2xl bg-card font-semibold inline-flex items-center justify-center gap-2 shadow-soft">
        <Download size={16} /> Exportar CSV
      </button>

      <section>
        <h2 className="font-semibold mb-3">Transações</h2>
        <div className="space-y-2">
          {data.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Sem transações.</p>}
          {data.map((t: any) => (
            <div key={t.id} className="bg-card rounded-2xl p-4 shadow-soft flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{t.perfis?.nome ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  Unid. {t.perfis?.unidade ?? "—"} · {format(parseISO(t.created_at), "dd/MM HH:mm")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{brl(Number(t.valor_total))}</div>
                <div className={`text-[10px] uppercase font-bold ${
                  t.status_pagamento === "pago" ? "text-success" : t.status_pagamento === "pendente" ? "text-warning" : "text-muted-foreground"
                }`}>{t.status_pagamento}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
