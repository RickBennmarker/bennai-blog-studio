"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/types";
import {
  IconBot,
  IconPlug,
  IconPlay,
  IconLoader,
  IconSparkles,
  IconRadar,
} from "@/components/icons";
import { OpenRouterHelp, CmsHelp } from "@/components/CmsInstructions";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Laden mislukt");
        setSettings(data.settings);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  function setCfg(key: keyof Settings["cms_config"], value: string) {
    setSettings((s) =>
      s ? { ...s, cms_config: { ...s.cms_config, [key]: value } } : s
    );
  }

  async function scanTone() {
    setBusy("tone");
    setMessage(null);
    try {
      const res = await fetch("/api/seo/tone", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan mislukt");
      set("tone", data.tone);
      setMessage({
        kind: "ok",
        text: "Tone of voice uit je site gehaald. Controleer hem en klik Opslaan.",
      });
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  }

  async function testConnection() {
    if (!settings) return;
    setBusy("test-blog");
    setMessage(null);
    try {
      const res = await fetch("/api/setup/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.cms_provider,
          config: settings.cms_config,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verbindingstest mislukt");
      setMessage({
        kind: "ok",
        text: `Verbonden met je site (${data.count} ${data.count === 1 ? "post" : "posts"}).`,
      });
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!settings) return;
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Opslaan mislukt");
      setSettings(data.settings);
      setMessage({ kind: "ok", text: "Instellingen opgeslagen." });
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  }

  async function testAutopilot() {
    if (
      !confirm(
        "De agent genereert nu direct een volledige blogpost (en publiceert die als 'direct publiceren' aan staat). Doorgaan?"
      )
    )
      return;
    setBusy("test");
    setMessage(null);
    try {
      const res = await fetch("/api/autopilot/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Autopilot-run mislukt");
      setMessage({
        kind: "ok",
        text: data.published
          ? `De agent publiceerde: "${data.title}"`
          : `De agent maakte een draft: "${data.title}" — check Drafts.`,
      });
      if (data.draftId && !data.published) {
        router.push(`/drafts/${data.draftId}`);
      }
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <div className="card border-danger/30 bg-danger/10 p-6 text-sm text-danger">
        <strong>Instellingen laden mislukt.</strong> Controleer .env.local.
        <div className="mt-2 font-mono text-xs">{loadError}</div>
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted">
        <IconLoader className="mr-2 h-4 w-4" /> Laden…
      </div>
    );
  }

  return (
    <div className="reveal">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instellingen</h1>
          <p className="mt-1 text-sm text-muted">
            Siteprofiel, publicatie-koppeling en autopilot.
          </p>
        </div>
        <button onClick={save} disabled={busy !== null} className="btn-primary">
          {busy === "save" ? <IconLoader className="h-4 w-4" /> : null}
          Opslaan
        </button>
      </div>

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

      <div className="mt-6 space-y-6">
        {/* Siteprofiel */}
        <section className="card p-6">
          <h2 className="font-semibold">Siteprofiel</h2>
          <p className="mt-1 text-xs text-muted">
            Hiermee bepaalt de agent waarover en hoe hij schrijft.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Sitenaam</label>
              <input
                value={settings.site_name}
                onChange={(e) => set("site_name", e.target.value)}
                placeholder="Bijv. BennAI"
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Site-URL</label>
              <input
                value={settings.site_url}
                onChange={(e) => set("site_url", e.target.value)}
                placeholder="https://…"
                className="input mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Niche / waar gaat de site over</label>
              <textarea
                value={settings.niche}
                onChange={(e) => set("niche", e.target.value)}
                rows={2}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Doelgroep</label>
              <input
                value={settings.audience}
                onChange={(e) => set("audience", e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Taal</label>
              <input
                value={settings.language}
                onChange={(e) => set("language", e.target.value)}
                className="input mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <label className="label">Tone of voice</label>
                <button
                  type="button"
                  onClick={scanTone}
                  disabled={busy !== null}
                  className="btn-ghost !px-2 !py-1 text-xs"
                  title="Analyseer je site en blogs om de schrijfstijl automatisch te bepalen"
                >
                  {busy === "tone" ? (
                    <>
                      <IconLoader className="h-3.5 w-3.5" /> Site scannen…
                    </>
                  ) : (
                    <>
                      <IconRadar className="h-3.5 w-3.5" /> Scan mijn site
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={settings.tone}
                onChange={(e) => set("tone", e.target.value)}
                rows={4}
                className="input mt-1"
              />
              <p className="mt-1 text-xs text-faint">
                Laat de agent je bestaande pagina&apos;s en blogs analyseren, of schrijf de
                stijl zelf.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Extra instructies (optioneel)</label>
              <textarea
                value={settings.extra_instructions}
                onChange={(e) => set("extra_instructions", e.target.value)}
                rows={2}
                placeholder="Bijv. verwijs nooit naar concurrenten, gebruik je/jij"
                className="input mt-1"
              />
            </div>
          </div>
        </section>

        {/* AI-modellen */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconSparkles className="h-4 w-4 text-primary" /> AI-modellen (via OpenRouter)
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">OpenRouter API-sleutel</label>
              <input
                value={settings.openrouter_key}
                onChange={(e) => set("openrouter_key", e.target.value)}
                type="password"
                placeholder="sk-or-…"
                className="input mt-1 font-mono text-xs"
              />
              <p className="mt-1 text-xs text-faint">
                Nodig om te schrijven en beelden te maken. Valt terug op OPENROUTER_API_KEY uit
                .env.local als dit leeg is.
              </p>
              <OpenRouterHelp />
            </div>
            <div>
              <label className="label">Tekstmodel</label>
              <input
                value={settings.text_model}
                onChange={(e) => set("text_model", e.target.value)}
                className="input mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <label className="label">Afbeeldingsmodel</label>
              <input
                value={settings.image_model}
                onChange={(e) => set("image_model", e.target.value)}
                className="input mt-1 font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Beeldstijl</label>
              <textarea
                value={settings.image_style}
                onChange={(e) => set("image_style", e.target.value)}
                rows={2}
                className="input mt-1"
              />
            </div>
          </div>
        </section>

        {/* Publicatie / CMS-koppeling */}
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconPlug className="h-4 w-4 text-primary" /> CMS-koppeling
          </h2>
          <p className="mt-1 text-xs text-muted">
            Waar de agent naartoe publiceert. Markdown wordt automatisch omgezet naar het
            formaat van je CMS.
          </p>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {(
              [
                { id: "wordpress", label: "WordPress" },
                { id: "shopify", label: "Shopify" },
                { id: "custom", label: "Ander systeem" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => set("cms_provider", o.id)}
                className={`rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${
                  settings.cms_provider === o.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {settings.cms_provider === "wordpress" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">WordPress site-URL</label>
                <input
                  value={settings.cms_config.wp_url ?? ""}
                  onChange={(e) => setCfg("wp_url", e.target.value)}
                  placeholder="https://jouwsite.nl"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="label">Gebruikersnaam</label>
                <input
                  value={settings.cms_config.wp_username ?? ""}
                  onChange={(e) => setCfg("wp_username", e.target.value)}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="label">Application Password</label>
                <input
                  value={settings.cms_config.wp_app_password ?? ""}
                  onChange={(e) => setCfg("wp_app_password", e.target.value)}
                  type="password"
                  className="input mt-1 font-mono text-xs"
                />
              </div>
            </div>
          )}

          {settings.cms_provider === "shopify" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Winkeldomein</label>
                <input
                  value={settings.cms_config.shopify_store ?? ""}
                  onChange={(e) => setCfg("shopify_store", e.target.value)}
                  placeholder="jouwwinkel.myshopify.com"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="label">Admin API access token</label>
                <input
                  value={settings.cms_config.shopify_token ?? ""}
                  onChange={(e) => setCfg("shopify_token", e.target.value)}
                  type="password"
                  placeholder="shpat_…"
                  className="input mt-1 font-mono text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Blog-ID (optioneel)</label>
                <input
                  value={settings.cms_config.shopify_blog_id ?? ""}
                  onChange={(e) => setCfg("shopify_blog_id", e.target.value)}
                  placeholder="Leeg = eerste blog automatisch"
                  className="input mt-1"
                />
              </div>
            </div>
          )}

          {settings.cms_provider === "custom" && (
            <div className="mt-4 grid gap-4">
              <div>
                <label className="label">Publish-URL (endpoint)</label>
                <input
                  value={settings.cms_config.custom_publish_url ?? ""}
                  onChange={(e) => setCfg("custom_publish_url", e.target.value)}
                  placeholder="https://xxxx.supabase.co/functions/v1/blog-publish"
                  className="input mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="label">API-sleutel (x-api-key)</label>
                <input
                  value={settings.cms_config.custom_api_key ?? ""}
                  onChange={(e) => setCfg("custom_api_key", e.target.value)}
                  type="password"
                  className="input mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="label">Image-upload-URL (optioneel)</label>
                <input
                  value={settings.cms_config.custom_image_upload_url ?? ""}
                  onChange={(e) => setCfg("custom_image_upload_url", e.target.value)}
                  placeholder="Leeg = beeld als data-URI meesturen"
                  className="input mt-1 font-mono text-xs"
                />
              </div>
            </div>
          )}

          {settings.cms_provider && <CmsHelp provider={settings.cms_provider} />}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Auteursnaam</label>
              <input
                value={settings.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="Bijv. je merk of naam"
                className="input mt-1"
              />
              <p className="mt-1 text-xs text-faint">
                Wordt als auteur bij elke post meegestuurd.
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={testConnection}
                disabled={busy !== null || !settings.cms_provider}
                className="btn-secondary"
              >
                {busy === "test-blog" ? (
                  <IconLoader className="h-4 w-4" />
                ) : (
                  <IconPlug className="h-4 w-4" />
                )}
                Test verbinding
              </button>
            </div>
          </div>
        </section>

        {/* Autopilot */}
        <section className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <IconBot className="h-4 w-4 text-primary" /> Autopilot
              </h2>
              <p className="mt-1 text-xs text-muted">
                De agent bedenkt, schrijft en publiceert zelfstandig op schema. Vereist een
                draaiende scheduler: <code className="rounded bg-surface-3 px-1">npm run scheduler</code>
              </p>
            </div>
            <button
              onClick={() => set("autopilot_enabled", !settings.autopilot_enabled)}
              role="switch"
              aria-checked={settings.autopilot_enabled}
              aria-label="Autopilot aan/uit"
              className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                settings.autopilot_enabled ? "bg-success" : "bg-surface-3"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200 ${
                  settings.autopilot_enabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Interval</label>
              <select
                value={settings.autopilot_interval_days}
                onChange={(e) => set("autopilot_interval_days", Number(e.target.value))}
                className="input mt-1"
              >
                <option value={1}>Elke dag</option>
                <option value={2}>Om de dag</option>
                <option value={3}>2x per week (elke 3 dagen)</option>
                <option value={7}>1x per week</option>
                <option value={14}>1x per twee weken</option>
              </select>
            </div>
            <div>
              <label className="label">Tijdstip</label>
              <select
                value={settings.autopilot_hour}
                onChange={(e) => set("autopilot_hour", Number(e.target.value))}
                className="input mt-1"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Na genereren</label>
              <select
                value={settings.autopilot_publish_direct ? "direct" : "review"}
                onChange={(e) =>
                  set("autopilot_publish_direct", e.target.value === "direct")
                }
                className="input mt-1"
              >
                <option value="review">Klaarzetten voor review</option>
                <option value="direct">Direct publiceren</option>
              </select>
            </div>
          </div>

          <button
            onClick={testAutopilot}
            disabled={busy !== null}
            className="btn-secondary mt-4"
          >
            {busy === "test" ? (
              <>
                <IconLoader className="h-4 w-4" /> Agent draait… (±2 min)
              </>
            ) : (
              <>
                <IconPlay className="h-4 w-4" /> Test nu een run
              </>
            )}
          </button>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={save} disabled={busy !== null} className="btn-primary">
          {busy === "save" ? <IconLoader className="h-4 w-4" /> : null}
          Opslaan
        </button>
      </div>
    </div>
  );
}
