import Link from "next/link";
import {
  listDrafts,
  getSettings,
  getAnalysis,
  getLog,
  lastAutopilotRun,
} from "@/lib/store";
import StatusBadge from "@/components/StatusBadge";
import { CountUp, Tilt } from "@/components/effects";
import {
  IconBot,
  IconRadar,
  IconPlus,
  IconSend,
  IconAlert,
  IconSparkles,
  IconImage,
  StatusDot,
} from "@/components/icons";
import type { LogEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

const LOG_META: Record<
  LogEntry["kind"],
  { icon: typeof IconSend; className: string }
> = {
  publish: { icon: IconSend, className: "bg-success/15 text-success" },
  autopilot: { icon: IconBot, className: "bg-primary/15 text-primary" },
  analyse: { icon: IconRadar, className: "bg-accent/15 text-accent" },
  error: { icon: IconAlert, className: "bg-danger/15 text-danger" },
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Goedenacht";
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export default async function DashboardPage() {
  const [settings, drafts, analysis, log, lastRun] = await Promise.all([
    getSettings(),
    listDrafts(),
    getAnalysis(),
    getLog(8),
    lastAutopilotRun(),
  ]);

  const draftCount = drafts.filter((d) => d.status === "draft").length;
  const publishedCount = drafts.filter((d) => d.status === "published").length;
  const scheduledCount = drafts.filter((d) => d.status === "scheduled").length;
  const openOpportunities =
    analysis?.opportunities.filter((o) => o.gap !== "bestaat" && !o.draft_id).length ?? 0;
  const recent = drafts.slice(0, 4);
  const needsSetup = !settings.cms_provider;

  const stats = [
    {
      href: "/kansen",
      label: "Open kansen",
      value: openOpportunities,
      icon: IconRadar,
      color: "text-accent",
      note: analysis ? "uit de laatste site-analyse" : "nog geen analyse gedraaid",
    },
    {
      href: "/drafts",
      label: "Klaar voor review",
      value: draftCount,
      icon: IconSparkles,
      color: "text-primary",
      note: "wachten op jouw goedkeuring",
    },
    {
      href: "/planning",
      label: "Ingepland",
      value: scheduledCount,
      icon: IconPlus,
      color: "text-warning",
      note: "staan klaar in de kalender",
    },
    {
      href: "/published",
      label: settings.site_name ? `Live op ${settings.site_name}` : "Live",
      value: publishedCount,
      icon: IconSend,
      color: "text-success",
      note: "gepubliceerde artikelen",
    },
  ];

  return (
    <div className="reveal">
      {/* Agent-hero */}
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="grid-pattern pointer-events-none absolute inset-0" />
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 50% 80% at 85% 20%, rgba(124,58,237,.22), transparent), radial-gradient(ellipse 40% 60% at 100% 100%, rgba(236,72,153,.12), transparent)",
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="agent-avatar flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-strong to-accent text-2xl text-white">
              <IconBot />
            </span>
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-faint">
                {greeting()}
                {settings.author ? `, ${settings.author}` : ""}
              </div>
              <h1 className="mt-0.5 text-2xl font-bold">
                BennAI <span className="text-gradient">Blog Studio</span>
              </h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                <StatusDot active={settings.autopilot_enabled} />
                {settings.autopilot_enabled ? (
                  <span>
                    Draait zelfstandig · elke {settings.autopilot_interval_days} dagen om{" "}
                    {settings.autopilot_hour}:00
                    {lastRun &&
                      ` · laatste run ${lastRun.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`}
                  </span>
                ) : (
                  <span>Stand-by — wacht op jouw opdracht</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Link href="/kansen" className="btn-secondary">
              <IconRadar className="h-4 w-4" /> Analyseer site
            </Link>
            <Link href="/new" className="btn-primary">
              <IconSparkles className="h-4 w-4" /> Nieuwe post
            </Link>
          </div>
        </div>
      </div>

      {needsSetup && (
        <div className="card mt-4 border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          Er is nog geen CMS gekoppeld.{" "}
          <Link href="/settings" className="underline">
            Rond de koppeling af bij Instellingen
          </Link>{" "}
          om te kunnen publiceren.
        </div>
      )}

      {/* Stats */}
      <div className="stagger mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ href, label, value, icon: Icon, color, note }) => (
          <Tilt key={href}>
            <Link href={href} className="card card-lift block p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className={`mt-1 font-display text-3xl font-bold ${color}`}>
                <CountUp value={value} />
              </div>
              <div className="mt-1 text-xs text-faint">{note}</div>
            </Link>
          </Tilt>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Recente posts */}
        <section>
          <h2 className="text-lg font-semibold">Recente posts</h2>
          {recent.length === 0 ? (
            <div className="card mt-3 border-dashed p-10 text-center">
              <p className="text-muted">
                Nog geen posts. Laat de agent zijn eerste blog schrijven.
              </p>
              <Link href="/new" className="btn-primary mt-4">
                <IconSparkles className="h-4 w-4" /> Eerste post genereren
              </Link>
            </div>
          ) : (
            <div className="stagger mt-3 space-y-2.5">
              {recent.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/drafts/${draft.id}`}
                  className="card card-lift flex items-center gap-4 p-4"
                >
                  {draft.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.image_url}
                      alt=""
                      className="h-14 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-surface-3 text-faint">
                      <IconImage className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{draft.title ?? draft.topic}</div>
                    <div className="mt-0.5 text-xs text-faint">
                      {new Date(draft.created_at).toLocaleString("nl-NL")} ·{" "}
                      {draft.source === "autopilot" ? "agent zelf" : "op verzoek"}
                    </div>
                  </div>
                  <StatusBadge status={draft.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Activity feed */}
        <section>
          <h2 className="text-lg font-semibold">Agent-activiteit</h2>
          {log.length === 0 ? (
            <div className="card mt-3 border-dashed p-6 text-center text-sm text-muted">
              Nog geen activiteit.
            </div>
          ) : (
            <div className="card mt-3 divide-y divide-border">
              <div className="stagger">
                {log.map((entry) => {
                  const meta = LOG_META[entry.kind] ?? LOG_META.autopilot;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={entry.id}
                      className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.className}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm text-text/90">{entry.message}</p>
                        <p className="mt-0.5 text-[11px] text-faint">
                          {new Date(entry.created_at).toLocaleString("nl-NL", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
