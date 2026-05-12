type S = "disponivel" | "ocupado" | "manutencao";

const map: Record<S, { color: string; label: string; bg: string }> = {
  disponivel: { color: "bg-success", label: "Disponível", bg: "bg-success/15 text-success" },
  ocupado: { color: "bg-accent", label: "Ocupado", bg: "bg-accent/15 text-accent" },
  manutencao: { color: "bg-muted-foreground", label: "Manutenção", bg: "bg-muted text-muted-foreground" },
};

export function StatusDot({ status }: { status: S }) {
  const m = map[status];
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${m.color}`} />;
}

export function StatusBadge({ status }: { status: S }) {
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${m.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.color}`} />
      {m.label}
    </span>
  );
}
