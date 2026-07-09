"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Draft } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import {
  IconChevronLeft,
  IconDraft,
  IconEye,
  IconSend,
  IconTrash,
  IconRefresh,
  IconImage,
  IconLoader,
  IconCalendar,
  IconClock,
} from "./icons";

/** Default plandatum: morgen 09:00, in het formaat van datetime-local. */
function defaultSchedule(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DraftEditor({ initialDraft }: { initialDraft: Draft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [busy, setBusy] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [when, setWhen] = useState(defaultSchedule);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const isPublished = draft.status === "published";
  const isScheduled = draft.status === "scheduled";

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function api(path: string, options: RequestInit) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Onbekende fout");
    return data;
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run("save", async () => {
      const data = await api(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draft.title,
          slug: draft.slug,
          excerpt: draft.excerpt,
          content: draft.content,
          meta_description: draft.meta_description,
          tags: draft.tags,
          image_prompt: draft.image_prompt,
        }),
      });
      setDraft(data.draft);
      setMessage({ kind: "ok", text: "Opgeslagen." });
    });

  const regenerateImage = () =>
    run("image", async () => {
      const data = await api("/api/image", {
        method: "POST",
        body: JSON.stringify({ draftId: draft.id, prompt: draft.image_prompt }),
      });
      setDraft(data.draft);
      setMessage({ kind: "ok", text: "Nieuwe afbeelding gegenereerd." });
    });

  const publish = () =>
    run("publish", async () => {
      await api(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draft.title,
          slug: draft.slug,
          excerpt: draft.excerpt,
          content: draft.content,
          meta_description: draft.meta_description,
        }),
      });
      await api("/api/publish", {
        method: "POST",
        body: JSON.stringify({ draftId: draft.id }),
      });
      setDraft((d) => ({ ...d, status: "published" }));
      setMessage({ kind: "ok", text: "Gepubliceerd — de post staat live op je site." });
    });

  const schedule = () =>
    run("schedule", async () => {
      const iso = new Date(when).toISOString();
      // Sla eerst bewerkingen op, zodat het CMS-concept de laatste versie krijgt.
      await api(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draft.title,
          slug: draft.slug,
          excerpt: draft.excerpt,
          content: draft.content,
          meta_description: draft.meta_description,
          tags: draft.tags,
        }),
      });
      await api("/api/schedule", {
        method: "POST",
        body: JSON.stringify({ draftId: draft.id, scheduledFor: iso }),
      });
      setDraft((d) => ({ ...d, status: "scheduled", scheduled_for: iso }));
      setPlanning(false);
      setMessage({
        kind: "ok",
        text: `Ingepland voor ${new Date(iso).toLocaleString("nl-NL")} — staat als concept klaar in je CMS.`,
      });
    });

  const unschedule = () =>
    run("unschedule", async () => {
      await api("/api/schedule", {
        method: "DELETE",
        body: JSON.stringify({ draftId: draft.id }),
      });
      setDraft((d) => ({ ...d, status: "draft", scheduled_for: null }));
      setMessage({ kind: "ok", text: "Uit de planning gehaald." });
    });

  const remove = () =>
    run("delete", async () => {
      if (!confirm("Deze draft definitief verwijderen?")) return;
      await api(`/api/drafts/${draft.id}`, { method: "DELETE" });
      router.push("/drafts");
    });

  return (
    <div className="reveal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/drafts")} className="btn-ghost !px-3">
            <IconChevronLeft className="h-4 w-4" /> Terug
          </button>
          <StatusBadge status={draft.status} />
          {draft.source === "autopilot" && (
            <span className="text-xs text-faint">door de agent zelf</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isPublished && (
            <>
              <button
                onClick={() => setMode(mode === "preview" ? "edit" : "preview")}
                className="btn-secondary"
              >
                {mode === "preview" ? (
                  <>
                    <IconDraft className="h-4 w-4" /> Bewerken
                  </>
                ) : (
                  <>
                    <IconEye className="h-4 w-4" /> Preview
                  </>
                )}
              </button>
              <button onClick={save} disabled={busy !== null} className="btn-secondary">
                {busy === "save" ? <IconLoader className="h-4 w-4" /> : null}
                Opslaan
              </button>
              {isScheduled ? (
                <button onClick={unschedule} disabled={busy !== null} className="btn-secondary">
                  {busy === "unschedule" ? <IconLoader className="h-4 w-4" /> : null}
                  Uit planning
                </button>
              ) : (
                <button
                  onClick={() => setPlanning((p) => !p)}
                  disabled={busy !== null || !draft.content}
                  className="btn-secondary"
                >
                  <IconCalendar className="h-4 w-4" /> Plan
                </button>
              )}
              <button
                onClick={publish}
                disabled={busy !== null || !draft.content}
                className="btn-success"
              >
                {busy === "publish" ? (
                  <IconLoader className="h-4 w-4" />
                ) : (
                  <IconSend className="h-4 w-4" />
                )}
                {isScheduled ? "Nu publiceren" : "Publiceer"}
              </button>
            </>
          )}
          <button
            onClick={remove}
            disabled={busy !== null}
            className="btn-danger"
            aria-label="Draft verwijderen"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isScheduled && draft.scheduled_for && (
        <div className="card mt-4 flex items-center gap-3 border-accent/30 bg-accent/10 p-3.5 text-sm text-accent">
          <IconClock className="h-4 w-4 shrink-0" />
          <span>
            Ingepland voor{" "}
            <strong>{new Date(draft.scheduled_for).toLocaleString("nl-NL")}</strong> · staat
            als concept klaar in je CMS en gaat dan automatisch live.
          </span>
        </div>
      )}

      {planning && !isScheduled && (
        <div className="card mt-4 flex flex-wrap items-end gap-3 border-accent/30 bg-surface-2 p-4">
          <div>
            <label className="label">Publiceren op</label>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="input mt-1 w-auto"
            />
          </div>
          <button onClick={schedule} disabled={busy !== null} className="btn-primary">
            {busy === "schedule" ? (
              <IconLoader className="h-4 w-4" />
            ) : (
              <IconCalendar className="h-4 w-4" />
            )}
            Inplannen
          </button>
          <p className="w-full text-xs text-faint">
            De post wordt nu al als concept naar je CMS gepusht en gaat op het gekozen
            moment automatisch live (mits de scheduler draait).
          </p>
        </div>
      )}

      {message && (
        <div
          className={`card mt-4 p-3.5 text-sm ${
            message.kind === "ok"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </div>
      )}
      {draft.error && (
        <div className="card mt-4 border-warning/30 bg-warning/10 p-3.5 text-sm text-warning">
          {draft.error}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Hoofdkolom */}
        <div className="card overflow-hidden">
          {draft.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.image_url} alt="" className="h-64 w-full object-cover" />
          )}
          <div className="p-6 sm:p-8">
            {mode === "preview" ? (
              <>
                <h1 className="text-3xl font-bold leading-tight">
                  {draft.title ?? draft.topic}
                </h1>
                {draft.excerpt && <p className="mt-3 text-lg text-muted">{draft.excerpt}</p>}
                <hr className="my-6 border-border" />
                <div className="blog-content">
                  <ReactMarkdown>{draft.content ?? ""}</ReactMarkdown>
                </div>
              </>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="label">Titel</label>
                  <input
                    value={draft.title ?? ""}
                    onChange={(e) => set("title", e.target.value)}
                    className="input mt-1 text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="label">Samenvatting</label>
                  <textarea
                    value={draft.excerpt ?? ""}
                    onChange={(e) => set("excerpt", e.target.value)}
                    rows={2}
                    className="input mt-1"
                  />
                </div>
                <div>
                  <label className="label">Inhoud (Markdown)</label>
                  <textarea
                    value={draft.content ?? ""}
                    onChange={(e) => set("content", e.target.value)}
                    rows={24}
                    className="input mt-1 font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zijkolom */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <IconImage className="h-4 w-4 text-primary" /> Afbeelding
            </h3>
            <label className="sublabel mt-3">Prompt</label>
            <textarea
              value={draft.image_prompt ?? ""}
              onChange={(e) => set("image_prompt", e.target.value)}
              rows={4}
              disabled={isPublished}
              className="input mt-1 text-xs"
            />
            {!isPublished && (
              <button
                onClick={regenerateImage}
                disabled={busy !== null}
                className="btn-secondary mt-3 w-full"
              >
                {busy === "image" ? (
                  <>
                    <IconLoader className="h-4 w-4" /> Genereren… (±1 min)
                  </>
                ) : (
                  <>
                    <IconRefresh className="h-4 w-4" />
                    {draft.image_url ? "Nieuwe afbeelding" : "Genereer afbeelding"}
                  </>
                )}
              </button>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold">SEO</h3>
            <label className="sublabel mt-3">Slug</label>
            <input
              value={draft.slug ?? ""}
              onChange={(e) => set("slug", e.target.value)}
              disabled={isPublished}
              className="input mt-1 font-mono text-xs"
            />
            <label className="sublabel mt-3">Meta description</label>
            <textarea
              value={draft.meta_description ?? ""}
              onChange={(e) => set("meta_description", e.target.value)}
              rows={3}
              disabled={isPublished}
              className="input mt-1 text-xs"
            />
            <label className="sublabel mt-3">Tags (kommagescheiden)</label>
            <input
              value={(draft.tags ?? []).join(", ")}
              onChange={(e) =>
                set(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                )
              }
              disabled={isPublished}
              className="input mt-1 text-xs"
            />
          </div>

          <div className="card p-5 text-xs text-faint">
            <div>Onderwerp: {draft.topic}</div>
            <div className="mt-1">
              Aangemaakt: {new Date(draft.created_at).toLocaleString("nl-NL")}
            </div>
            {draft.published_at && (
              <div className="mt-1">
                Gepubliceerd: {new Date(draft.published_at).toLocaleString("nl-NL")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
