"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CmsConfig, CmsProviderId } from "@/lib/types";
import type { RecentPost } from "@/lib/setup/extract";
import {
  IconBot,
  IconGlobe,
  IconSparkles,
  IconPlug,
  IconLoader,
  IconCheck,
  IconCheckCircle,
  IconSend,
  IconExternal,
} from "@/components/icons";
import { OpenRouterHelp, CmsHelp } from "@/components/CmsInstructions";

type Msg = { kind: "ok" | "error"; text: string } | null;

const STEPS = ["Bedrijf", "Profiel", "CMS-koppeling", "Klaar"];

const CMS_OPTIONS: { id: CmsProviderId; label: string; hint: string }[] = [
  { id: "wordpress", label: "WordPress", hint: "REST API + Application Password" },
  { id: "shopify", label: "Shopify", hint: "Admin API access token" },
  { id: "custom", label: "Ander systeem", hint: "Eigen blog-API (URL + sleutel)" },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stap 1 — bedrijf
  const [url, setUrl] = useState("");
  const [orKey, setOrKey] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  // Stap 2 — profiel (voorgevuld door de analyse)
  const [form, setForm] = useState({
    site_name: "",
    niche: "",
    audience: "",
    language: "Nederlands",
    tone: "",
    author: "",
    extra_instructions: "",
  });
  const setField = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Stap 3 — CMS
  const [provider, setProvider] = useState<CmsProviderId>("");
  const [cms, setCms] = useState<CmsConfig>({});
  const [cmsTest, setCmsTest] = useState<Msg>(null);
  const setCfg = (k: keyof CmsConfig, v: string) =>
    setCms((c) => ({ ...c, [k]: v }));

  // Stap 4
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [detected, setDetected] = useState<CmsProviderId>("");
  const [autopilot, setAutopilot] = useState(false);

  async function analyze() {
    if (!url.trim()) return setError("Vul je website-URL in.");
    setBusy("analyze");
    setError(null);
    try {
      const res = await fetch("/api/setup/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, openrouterKey: orKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analyse mislukt");
      const r = data.result;
      setSiteUrl(r.site_url);
      setForm({
        site_name: r.site_name || "",
        niche: r.niche || "",
        audience: r.audience || "",
        language: r.language || "Nederlands",
        tone: r.tone || "",
        author: r.author || "",
        extra_instructions: "",
      });
      setRecentPosts(r.recent_posts || []);
      setDetected(r.detected_cms || "");
      if (r.detected_cms) {
        setProvider(r.detected_cms);
        if (r.detected_cms === "wordpress") setCms((c) => ({ ...c, wp_url: r.site_url }));
        if (r.detected_cms === "custom") setCms((c) => ({ ...c, custom_publish_url: "" }));
      }
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function testCms() {
    setBusy("test");
    setCmsTest(null);
    try {
      const res = await fetch("/api/setup/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, config: cms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verbindingstest mislukt");
      setCmsTest({
        kind: "ok",
        text: `Verbonden ✓ — ${data.count} ${data.count === 1 ? "post" : "posts"} gevonden.`,
      });
    } catch (err) {
      setCmsTest({
        kind: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  }

  async function finish() {
    setBusy("finish");
    setError(null);
    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          site_url: siteUrl,
          openrouter_key: orKey || undefined,
          cms_provider: provider,
          cms_config: cms,
          autopilot_enabled: autopilot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Opslaan mislukt");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-strong to-accent text-xl text-white">
          <IconBot />
        </span>
        <div>
          <h1 className="text-xl font-bold">
            BennAI <span className="text-gradient">Blog Studio</span>
          </h1>
          <p className="text-sm text-muted">Setup — koppel je bedrijf in een paar stappen.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i < step
                  ? "bg-success text-white"
                  : i === step
                    ? "bg-primary text-white"
                    : "bg-surface-3 text-faint"
              }`}
            >
              {i < step ? <IconCheck className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={`hidden text-xs sm:inline ${i === step ? "text-text" : "text-faint"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="h-px flex-1 bg-border" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="card mt-4 border-danger/30 bg-danger/10 p-3.5 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Stap 1 — Bedrijf */}
      {step === 0 && (
        <section className="card mt-6 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconGlobe className="h-4 w-4 text-primary" /> Jouw bedrijf
          </h2>
          <p className="mt-1 text-sm text-muted">
            Geef je website-URL. De agent leest je site uit: bedrijfsprofiel, tone of voice
            en je recente blogs — die gebruikt hij straks om in jouw stem te schrijven.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Website-URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://jouwbedrijf.nl"
                className="input mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="label">OpenRouter API-sleutel</label>
              <input
                value={orKey}
                onChange={(e) => setOrKey(e.target.value)}
                placeholder="sk-or-..."
                type="password"
                className="input mt-1 font-mono text-xs"
              />
              <p className="mt-1 text-xs text-faint">
                Nodig om te schrijven en beelden te maken. Haal een sleutel op{" "}
                <a
                  href="https://openrouter.ai/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  openrouter.ai <IconExternal className="inline h-3 w-3" />
                </a>
                .
              </p>
              <OpenRouterHelp />
            </div>
          </div>
          <button
            onClick={analyze}
            disabled={busy !== null}
            className="btn-primary mt-6 w-full"
          >
            {busy === "analyze" ? (
              <>
                <IconLoader className="h-4 w-4" /> Site analyseren… (±30 sec)
              </>
            ) : (
              <>
                <IconSparkles className="h-4 w-4" /> Analyseer mijn bedrijf
              </>
            )}
          </button>
        </section>
      )}

      {/* Stap 2 — Profiel */}
      {step === 1 && (
        <section className="card mt-6 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconSparkles className="h-4 w-4 text-primary" /> Bedrijfsprofiel
          </h2>
          <p className="mt-1 text-sm text-muted">
            Automatisch uit je site gehaald. Controleer en pas aan waar nodig.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Bedrijfsnaam</label>
              <input
                value={form.site_name}
                onChange={(e) => setField("site_name", e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Auteursnaam</label>
              <input
                value={form.author}
                onChange={(e) => setField("author", e.target.value)}
                placeholder="Bijv. het merk of een persoon"
                className="input mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Waar gaat de site over</label>
              <textarea
                value={form.niche}
                onChange={(e) => setField("niche", e.target.value)}
                rows={2}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Doelgroep</label>
              <input
                value={form.audience}
                onChange={(e) => setField("audience", e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Taal</label>
              <input
                value={form.language}
                onChange={(e) => setField("language", e.target.value)}
                className="input mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Tone of voice</label>
              <textarea
                value={form.tone}
                onChange={(e) => setField("tone", e.target.value)}
                rows={5}
                className="input mt-1"
              />
              <p className="mt-1 text-xs text-faint">
                Zo schrijft de agent voortaan. Uit je site gedestilleerd.
              </p>
            </div>
          </div>
          {recentPosts.length > 0 && (
            <div className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted">
              <IconCheckCircle className="mr-1 inline h-3.5 w-3.5 text-success" />
              {recentPosts.length} recente blog{recentPosts.length === 1 ? "" : "s"} gevonden —
              de agent gebruikt ze voor interne links en dedup.
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(0)} className="btn-ghost">
              Terug
            </button>
            <button onClick={() => setStep(2)} className="btn-primary">
              Volgende
            </button>
          </div>
        </section>
      )}

      {/* Stap 3 — CMS */}
      {step === 2 && (
        <section className="card mt-6 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconPlug className="h-4 w-4 text-primary" /> Koppel je CMS
          </h2>
          <p className="mt-1 text-sm text-muted">
            Waar staat je website? Hier publiceert de agent straks automatisch naartoe.
          </p>
          {detected && (
            <p className="mt-2 text-xs text-success">
              <IconCheckCircle className="mr-1 inline h-3.5 w-3.5" />
              Gedetecteerd: {CMS_OPTIONS.find((o) => o.id === detected)?.label}. Voorgeselecteerd.
            </p>
          )}

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {CMS_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setProvider(o.id);
                  setCmsTest(null);
                  if (o.id === "wordpress" && !cms.wp_url)
                    setCms((c) => ({ ...c, wp_url: siteUrl }));
                }}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  provider === o.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                <div className="text-sm font-semibold">{o.label}</div>
                <div className="mt-0.5 text-[11px] text-faint">{o.hint}</div>
              </button>
            ))}
          </div>

          {/* Provider-specifieke velden */}
          {provider === "wordpress" && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="label">WordPress site-URL</label>
                <input
                  value={cms.wp_url ?? ""}
                  onChange={(e) => setCfg("wp_url", e.target.value)}
                  placeholder="https://jouwsite.nl"
                  className="input mt-1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Gebruikersnaam</label>
                  <input
                    value={cms.wp_username ?? ""}
                    onChange={(e) => setCfg("wp_username", e.target.value)}
                    className="input mt-1"
                  />
                </div>
                <div>
                  <label className="label">Application Password</label>
                  <input
                    value={cms.wp_app_password ?? ""}
                    onChange={(e) => setCfg("wp_app_password", e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    type="password"
                    className="input mt-1 font-mono text-xs"
                  />
                </div>
              </div>
              <p className="text-xs text-faint">
                Maak deze aan in WordPress onder <strong>Gebruikers → Profiel → Application
                Passwords</strong>.
              </p>
            </div>
          )}

          {provider === "shopify" && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="label">Winkeldomein</label>
                <input
                  value={cms.shopify_store ?? ""}
                  onChange={(e) => setCfg("shopify_store", e.target.value)}
                  placeholder="jouwwinkel.myshopify.com"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="label">Admin API access token</label>
                <input
                  value={cms.shopify_token ?? ""}
                  onChange={(e) => setCfg("shopify_token", e.target.value)}
                  placeholder="shpat_..."
                  type="password"
                  className="input mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="label">Blog-ID (optioneel)</label>
                <input
                  value={cms.shopify_blog_id ?? ""}
                  onChange={(e) => setCfg("shopify_blog_id", e.target.value)}
                  placeholder="Leeg = eerste blog automatisch"
                  className="input mt-1"
                />
              </div>
              <p className="text-xs text-faint">
                Maak een custom app in Shopify met scope <code>write_content</code> en kopieer
                het Admin API access token.
              </p>
            </div>
          )}

          {provider === "custom" && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="label">Publish-URL (endpoint)</label>
                <input
                  value={cms.custom_publish_url ?? ""}
                  onChange={(e) => setCfg("custom_publish_url", e.target.value)}
                  placeholder="https://xxxx.supabase.co/functions/v1/blog-publish"
                  className="input mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="label">API-sleutel (x-api-key)</label>
                <input
                  value={cms.custom_api_key ?? ""}
                  onChange={(e) => setCfg("custom_api_key", e.target.value)}
                  type="password"
                  className="input mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="label">Image-upload-URL (optioneel)</label>
                <input
                  value={cms.custom_image_upload_url ?? ""}
                  onChange={(e) => setCfg("custom_image_upload_url", e.target.value)}
                  placeholder="Leeg = beeld als data-URI meesturen"
                  className="input mt-1 font-mono text-xs"
                />
              </div>
            </div>
          )}

          {provider && <CmsHelp key={provider} provider={provider} defaultOpen />}

          {provider && (
            <div className="mt-4">
              <button onClick={testCms} disabled={busy !== null} className="btn-secondary">
                {busy === "test" ? (
                  <IconLoader className="h-4 w-4" />
                ) : (
                  <IconPlug className="h-4 w-4" />
                )}
                Test verbinding
              </button>
              {cmsTest && (
                <div
                  className={`mt-3 rounded-xl p-3 text-sm ${
                    cmsTest.kind === "ok"
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {cmsTest.text}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="btn-ghost">
              Terug
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!provider}
              className="btn-primary"
            >
              Volgende
            </button>
          </div>
        </section>
      )}

      {/* Stap 4 — Klaar */}
      {step === 3 && (
        <section className="card mt-6 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconCheckCircle className="h-4 w-4 text-success" /> Bijna klaar
          </h2>
          <p className="mt-1 text-sm text-muted">
            Alles staat klaar. Zet eventueel de autopilot aan — dan bedenkt, schrijft en
            publiceert de agent zelfstandig op schema.
          </p>

          <div className="mt-5 space-y-2 rounded-xl bg-surface-2 p-4 text-sm">
            <Row label="Bedrijf" value={form.site_name || "—"} />
            <Row label="CMS" value={CMS_OPTIONS.find((o) => o.id === provider)?.label ?? "—"} />
            <Row
              label="Recente blogs gevonden"
              value={String(recentPosts.length)}
            />
          </div>

          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <div className="text-sm font-medium">Autopilot direct aanzetten</div>
              <div className="text-xs text-faint">
                Kan altijd later bij Instellingen. Vereist een draaiende scheduler.
              </div>
            </div>
            <input
              type="checkbox"
              checked={autopilot}
              onChange={(e) => setAutopilot(e.target.checked)}
              className="h-5 w-5 accent-[var(--color-primary,#7c3aed)]"
            />
          </label>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(2)} className="btn-ghost">
              Terug
            </button>
            <button onClick={finish} disabled={busy !== null} className="btn-primary">
              {busy === "finish" ? (
                <>
                  <IconLoader className="h-4 w-4" /> Opslaan…
                </>
              ) : (
                <>
                  <IconSend className="h-4 w-4" /> Setup afronden
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
