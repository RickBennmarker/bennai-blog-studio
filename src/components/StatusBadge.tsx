const STYLES: Record<string, { label: string; className: string }> = {
  generating: { label: "Agent schrijft…", className: "bg-warning/15 text-warning ring-1 ring-warning/25" },
  draft: { label: "Klaar voor review", className: "bg-primary/15 text-primary ring-1 ring-primary/25" },
  scheduled: { label: "Ingepland", className: "bg-accent/15 text-accent ring-1 ring-accent/25" },
  published: { label: "Live", className: "bg-success/15 text-success ring-1 ring-success/25" },
  failed: { label: "Mislukt", className: "bg-danger/15 text-danger ring-1 ring-danger/25" },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? {
    label: status,
    className: "bg-surface-3 text-muted",
  };
  return <span className={`chip ${s.className}`}>{s.label}</span>;
}
