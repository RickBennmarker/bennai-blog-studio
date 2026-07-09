"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Analysis, GapLevel, Opportunity, SearchIntent } from "@/lib/types";
import AgentWorking from "./AgentWorking";
import {
  IconRadar,
  IconSparkles,
  IconExternal,
  IconEye,
  IconLoader,
  IconAlert,
} from "./icons";

const GAP_STYLE: Record<GapLevel, { label: string; className: string }> = {
  ontbreekt: { label: "Ontbreekt", className: "bg-accent/15 text-accent ring-1 ring-accent/25" },
  dun: { label: "Dun gedekt", className: "bg-warning/15 text-warning ring-1 ring-warning/25" },
  bestaat: { label: "Bestaat al", className: "bg-surface-3 text-muted" },
};

const INTENT_LABEL: Record<SearchIntent, string> = {
  informatief: "Informatief",
  commercieel: "Commercieel",
  transactioneel: "Transactioneel",
  navigatie: "Navigatie",
};

function scoreColor(score: number): string {
  if (score >= 60) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-faint";
}

export default function OpportunitiesView({
  initialAnalysis,
  dataForSeo,
}: {
  initialAnalysis: Analysis | null;
  dataForSeo: boolean;
}) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cluster, setCluster] = useState<string>("alle");

  async function analyze() {
    setBusy("analyze");
    setError(null);
    try {
      const res = await fetch("/api/seo/analyze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analyse mislukt");
      setAnalysis(data.analysis);
      setCluster("alle");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function generate(opportunity: Opportunity) {
    setBusy(opportunity.id);
    setError(null);
    try {
      const res = await fetch("/api/seo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opportunity.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Genereren mislukt");
      router.push(`/drafts/${data.draft.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  if (busy === "analyze") {
    return (
      <AgentWorking
        title="De agent onderzoekt je site"
        steps={[
          { label: "Sitemap en pagina's crawlen", after: 2 },
          { label: "Kern-zoektermen bepalen", after: 8 },
          { label: `Zoekdata ophalen (Google${dataForSeo ? " + DataForSEO" : ""})`, after: 20 },
          { label: "Clusteren en content gaps bepalen", after: 45 },
          { label: "Kansen prioriteren en briefs schrijven", after: 75 },
        ]}
        note="Duurt 1 tot 3 minuten, afhankelijk van het aantal zoekwoorden."
      />
    );
  }

  const filtered =
    analysis && cluster !== "alle"
      ? analysis.opportunities.filter((o) => o.cluster === cluster)
      : (analysis?.opportunities ?? []);

  return (
    <div className="reveal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kansen</h1>
          <p className="mt-1 text-sm text-muted">
            Waar zoekt je doelgroep op, en welke content mis je nog?
          </p>
        </div>
        <button onClick={analyze} disabled={busy !== null} className="btn-primary">
          <IconRadar className="h-4 w-4" />
          {analysis ? "Opnieuw analyseren" : "Analyseer mijn site"}
        </button>
      </div>

      {analysis?.warning && (
        <div className="card mt-4 flex gap-3 border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{analysis.warning}</span>
        </div>
      )}

      {!dataForSeo && (
        <div className="card mt-4 border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <strong>Zonder zoekvolumes.</strong> Zoekwoorden komen uit Google autocomplete —
          echt zoekgedrag, maar zonder aantallen. Zet{" "}
          <code className="rounded bg-warning/15 px-1">DATAFORSEO_LOGIN</code> en{" "}
          <code className="rounded bg-warning/15 px-1">DATAFORSEO_PASSWORD</code> in
          .env.local voor volumes en difficulty.
        </div>
      )}

      {error && (
        <div className="card mt-4 border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {!analysis ? (
        <div className="card mt-6 border-dashed p-12 text-center">
          <IconRadar className="mx-auto h-10 w-10 text-faint" />
          <p className="mt-4 text-muted">
            Nog geen analyse. De agent crawlt je site, onderzoekt zoekgedrag en vindt de
            gaten in je content.
          </p>
          <button onClick={analyze} className="btn-primary mt-5">
            <IconRadar className="h-4 w-4" /> Analyseer mijn site
          </button>
        </div>
      ) : (
        <>
          <div className="stagger mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Kansen gevonden", value: analysis.opportunities.length },
              { label: "Zoekwoorden onderzocht", value: analysis.keywords_found },
              { label: "Pagina's gecrawld", value: analysis.pages_crawled },
              {
                label: "Ontbrekende content",
                value: analysis.opportunities.filter((o) => o.gap === "ontbreekt").length,
              },
            ].map((stat) => (
              <div key={stat.label} className="card p-4">
                <div className="text-xs text-muted">{stat.label}</div>
                <div className="mt-1 font-display text-2xl font-bold">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-xs text-faint">
            Analyse van {new Date(analysis.generated_at).toLocaleString("nl-NL")} ·{" "}
            {analysis.mode === "dataforseo" ? "met echte zoekvolumes" : "zonder volumedata"}
          </div>

          {analysis.clusters.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => setCluster("alle")}
                className={`chip cursor-pointer transition-colors ${
                  cluster === "alle"
                    ? "bg-primary text-white"
                    : "bg-surface-2 text-muted ring-1 ring-border hover:text-text"
                }`}
              >
                Alle ({analysis.opportunities.length})
              </button>
              {analysis.clusters.map((c) => {
                const count = analysis.opportunities.filter((o) => o.cluster === c.name).length;
                if (count === 0) return null;
                return (
                  <button
                    key={c.name}
                    onClick={() => setCluster(c.name)}
                    title={c.summary}
                    className={`chip cursor-pointer transition-colors ${
                      cluster === c.name
                        ? "bg-primary text-white"
                        : "bg-surface-2 text-muted ring-1 ring-border hover:text-text"
                    }`}
                  >
                    {c.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="stagger mt-4 space-y-3" key={cluster}>
            {filtered.map((o) => {
              const open = openId === o.id;
              return (
                <div key={o.id} className="card card-lift">
                  <div className="flex items-start gap-4 p-5">
                    <div className="w-14 shrink-0 text-center">
                      <div className={`font-display text-2xl font-bold ${scoreColor(o.score)}`}>
                        {o.score}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-faint">score</div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">{o.keyword}</span>
                        <span className={`chip ${GAP_STYLE[o.gap].className}`}>
                          {GAP_STYLE[o.gap].label}
                        </span>
                        <span className="chip bg-primary/15 text-primary ring-1 ring-primary/25">
                          {INTENT_LABEL[o.intent]}
                        </span>
                      </div>

                      <div className="mt-1.5 font-semibold leading-snug">
                        {o.title_suggestion}
                      </div>
                      <p className="mt-1 text-sm text-muted">{o.reason}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
                        {o.volume !== null ? (
                          <span>
                            <strong className="text-text">
                              {o.volume.toLocaleString("nl-NL")}
                            </strong>{" "}
                            zoekopdrachten/mnd
                          </span>
                        ) : (
                          analysis.mode === "dataforseo" && (
                            <span className="text-faint">geen meetbaar zoekvolume</span>
                          )
                        )}
                        {o.difficulty !== null && (
                          <span>
                            Moeilijkheid <strong className="text-text">{o.difficulty}</strong>/100
                          </span>
                        )}
                        {o.existing_url && (
                          <a
                            href={o.existing_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            bestaande pagina <IconExternal className="h-3 w-3" />
                          </a>
                        )}
                        <button
                          onClick={() => setOpenId(open ? null : o.id)}
                          className="cursor-pointer text-muted underline decoration-faint hover:text-text"
                        >
                          {open ? "verberg brief" : "bekijk brief"}
                        </button>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {o.draft_id ? (
                        <button
                          onClick={() => router.push(`/drafts/${o.draft_id}`)}
                          className="btn-success"
                        >
                          <IconEye className="h-4 w-4" /> Bekijk draft
                        </button>
                      ) : (
                        <button
                          onClick={() => generate(o)}
                          disabled={busy !== null}
                          className="btn-primary"
                        >
                          {busy === o.id ? (
                            <>
                              <IconLoader className="h-4 w-4" /> Schrijven…
                            </>
                          ) : (
                            <>
                              <IconSparkles className="h-4 w-4" /> Genereer blog
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {open && (
                    <div className="reveal border-t border-border bg-surface-2/60 px-5 py-4 text-sm">
                      <div className="text-text/90">
                        <strong>Invalshoek:</strong> {o.angle}
                      </div>
                      {o.outline.length > 0 && (
                        <div className="mt-3">
                          <strong className="text-text/90">Structuur:</strong>
                          <ul className="mt-1 list-disc pl-5 text-muted">
                            {o.outline.map((h) => (
                              <li key={h}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {o.related_keywords.length > 0 && (
                        <div className="mt-3">
                          <strong className="text-text/90">Verwante zoekwoorden:</strong>{" "}
                          <span className="text-muted">{o.related_keywords.join(" · ")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
