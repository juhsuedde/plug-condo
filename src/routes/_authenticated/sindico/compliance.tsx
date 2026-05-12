import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, FileDown, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sindico/compliance")({
  component: Page,
});

const ITEMS: { key: string; label: string; group: "save" | "lei"; weight: number }[] = [
  { key: "botao_emergencia", label: "Botão de emergência", group: "save", weight: 15 },
  { key: "deteccao_incendio", label: "Detecção de incêndio", group: "save", weight: 20 },
  { key: "sinalizacao", label: "Sinalização adequada", group: "save", weight: 10 },
  { key: "capacidade_eletrica", label: "Capacidade elétrica", group: "lei", weight: 20 },
  { key: "medicao_individual", label: "Medição individual", group: "lei", weight: 10 },
  { key: "doc_save", label: "Documento SAVE", group: "save", weight: 10 },
  { key: "doc_art", label: "ART assinada", group: "lei", weight: 10 },
  { key: "doc_nbr17019", label: "Laudo NBR 17019", group: "lei", weight: 5 },
];

function Page() {
  const { perfil } = useAuth();
  const condoId = perfil?.condominio_id;

  const { data: condo } = useQuery({
    queryKey: ["condo-compliance", condoId],
    enabled: !!condoId,
    queryFn: async () => (await supabase.from("condominios").select("*").eq("id", condoId!).single()).data,
  });

  const compliance = (condo as any)?.compliance ?? {};
  const score = useMemo(() => {
    return ITEMS.reduce((s, it) => s + (compliance[it.key] ? it.weight : 0), 0);
  }, [compliance]);

  const tone = score >= 85 ? "success" : score >= 60 ? "warning" : "destructive";
  const toneLabel = score >= 85 ? "Ótimo" : score >= 60 ? "Atenção" : "Crítico";

  const generateReport = () => {
    const lines: string[] = [];
    lines.push(`RELATÓRIO DE CONFORMIDADE — ${condo?.nome ?? ""}`);
    lines.push(`Endereço: ${condo?.endereco ?? "—"}`);
    lines.push(`Data: ${new Date().toLocaleDateString("pt-BR")}`);
    lines.push(`Pontuação: ${score}/100 (${toneLabel})`);
    lines.push("");
    lines.push("Diretriz SAVE & Lei 18.403/2026:");
    ITEMS.forEach((it) => {
      lines.push(`[${compliance[it.key] ? "X" : " "}] ${it.label} (${it.group.toUpperCase()})`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conformidade-${(condo?.nome ?? "condo").replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório gerado");
  };

  return (
    <div className="px-5 pt-6 pb-6 space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-primary font-bold">Conformidade</p>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1">Saúde regulatória</h1>
      </header>

  const toneClasses = {
    success: { bg: "bg-success/15", border: "border-success/30", chip: "bg-success text-success-foreground", solid: "bg-success", text: "text-success", soft: "bg-success/30" },
    warning: { bg: "bg-warning/15", border: "border-warning/30", chip: "bg-warning text-warning-foreground", solid: "bg-warning", text: "text-warning", soft: "bg-warning/30" },
    destructive: { bg: "bg-destructive/15", border: "border-destructive/30", chip: "bg-destructive text-destructive-foreground", solid: "bg-destructive", text: "text-destructive", soft: "bg-destructive/30" },
  }[tone];

      <section className={`rounded-3xl p-6 shadow-card ${toneClasses.bg} border ${toneClasses.border}`}>
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-full ${toneClasses.soft} grid place-items-center`}>
            <Shield className={toneClasses.text} size={24} />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Score atual</div>
            <div className="text-3xl font-extrabold text-foreground">{score}<span className="text-base text-muted-foreground">/100</span></div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${toneClasses.chip}`}>{toneLabel}</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-card overflow-hidden">
          <div className={`h-full ${toneClasses.solid}`} style={{ width: `${score}%` }} />
        </div>
      </section>

      <section className="bg-card rounded-3xl shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-bold">Diretriz SAVE</h2>
          <p className="text-[11px] text-muted-foreground">Requisitos de segurança contra incêndio</p>
        </div>
        <ul className="divide-y">
          {ITEMS.filter((i) => i.group === "save").map((it) => (
            <Row key={it.key} label={it.label} ok={!!compliance[it.key]} />
          ))}
        </ul>
      </section>

      <section className="bg-card rounded-3xl shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-bold">Lei 18.403/2026</h2>
          <p className="text-[11px] text-muted-foreground">Requisitos de instalação e operação</p>
        </div>
        <ul className="divide-y">
          {ITEMS.filter((i) => i.group === "lei").map((it) => (
            <Row key={it.key} label={it.label} ok={!!compliance[it.key]} />
          ))}
        </ul>
      </section>

      <button onClick={generateReport}
        className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 shadow-card">
        <FileDown size={16} /> Gerar relatório para assembleia
      </button>

      <p className="text-[11px] text-center text-muted-foreground">Atualize os itens na tela de configuração inicial.</p>
    </div>
  );
}

function Row({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="px-5 py-3 flex items-center gap-3">
      {ok ? <CheckCircle2 className="text-success" size={20} /> : <XCircle className="text-destructive" size={20} />}
      <span className="text-sm flex-1">{label}</span>
      <span className={`text-[10px] uppercase font-bold ${ok ? "text-success" : "text-destructive"}`}>
        {ok ? "OK" : "Pendente"}
      </span>
    </li>
  );
}
