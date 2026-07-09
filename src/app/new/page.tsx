"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AgentWorking from "@/components/AgentWorking";
import { IconSparkles, IconLightbulb, IconLoader } from "@/components/icons";

export default function NewPostPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSuggestions() {
    setLoadingSuggestions(true);
    setError(null);
    try {
      const res = await fetch("/api/topics", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Onbekende fout");
      setSuggestions(data.topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function generate(chosenTopic: string) {
    if (!chosenTopic.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: chosenTopic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Onbekende fout");
      router.push(`/drafts/${data.draft.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <AgentWorking
        title="De agent schrijft je blog"
        steps={[
          { label: "Bestaande artikelen checken (geen dubbel werk)", after: 2 },
          { label: "Artikel schrijven met Claude", after: 8 },
          { label: "SEO: titel, slug, meta description, tags", after: 40 },
          { label: "Featured image genereren", after: 55 },
          { label: "Draft klaarzetten voor review", after: 95 },
        ]}
        note="Duurt 1 à 2 minuten. Je wordt automatisch doorgestuurd naar de preview."
      />
    );
  }

  return (
    <div className="reveal">
      <h1 className="text-2xl font-bold">Nieuwe post</h1>
      <p className="mt-1 text-sm text-muted">
        Geef de agent een onderwerp, of laat hem zelf met ideeën komen.
      </p>

      <div className="card mt-6 p-6">
        <label htmlFor="topic" className="label">
          Waar moet de blog over gaan?
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          placeholder="Bijv. 'AI-training voor salesteams: wat levert het op?' — hoe specifieker, hoe beter"
          className="input mt-2"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={() => generate(topic)} disabled={!topic.trim()} className="btn-primary">
            <IconSparkles className="h-4 w-4" /> Genereer blog + afbeelding
          </button>
          <button onClick={fetchSuggestions} disabled={loadingSuggestions} className="btn-secondary">
            {loadingSuggestions ? (
              <>
                <IconLoader className="h-4 w-4" /> Agent denkt na…
              </>
            ) : (
              <>
                <IconLightbulb className="h-4 w-4" /> Geef mij ideeën
              </>
            )}
          </button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-6 reveal">
          <h2 className="text-sm font-semibold text-muted">
            Voorstellen van de agent — klik om direct te genereren
          </h2>
          <div className="stagger mt-3 grid gap-2 sm:grid-cols-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => generate(s)}
                className="card card-lift cursor-pointer p-4 text-left text-sm hover:bg-surface-2"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="card mt-6 border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}
    </div>
  );
}
