import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Analysis, Draft, LogEntry, Opportunity, Settings } from "./types";

/**
 * Lokale opslag in JSON-bestanden onder ./data.
 * Lovable Cloud beheert de Supabase zelf, dus we hebben geen database-toegang;
 * drafts, instellingen en logs bewaren we daarom naast het dashboard.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const FILES = {
  drafts: path.join(DATA_DIR, "drafts.json"),
  settings: path.join(DATA_DIR, "settings.json"),
  log: path.join(DATA_DIR, "log.json"),
  analysis: path.join(DATA_DIR, "analysis.json"),
};

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

// Schrijf atomisch, zodat een crash midden in een write het bestand niet sloopt.
async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

/**
 * Serialiseert schrijfacties: twee gelijktijdige requests mogen elkaars
 * wijzigingen niet overschrijven (read-modify-write race).
 */
let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn, fn);
  queue = result.catch(() => {});
  return result;
}

/* ------------------------------- Instellingen ------------------------------ */

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  setup_complete: false,
  site_name: "",
  site_url: "",
  niche: "",
  audience: "",
  tone: "",
  language: "Nederlands",
  extra_instructions: "",
  openrouter_key: "",
  text_model: "anthropic/claude-sonnet-4.5",
  image_model: "openai/gpt-5-image-mini",
  image_style:
    "Moderne, fotorealistische featured image met veel licht. Geen tekst in de afbeelding.",
  author: "",
  cms_provider: "",
  cms_config: {},
  autopilot_enabled: false,
  autopilot_interval_days: 3,
  autopilot_hour: 9,
  autopilot_publish_direct: false,
  updated_at: new Date(0).toISOString(),
};

export async function getSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(FILES.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return withLock(async () => {
    const current = await getSettings();
    const next: Settings = {
      ...current,
      ...patch,
      id: 1,
      updated_at: new Date().toISOString(),
    };
    await writeJson(FILES.settings, next);
    return next;
  });
}

/* ---------------------------------- Drafts --------------------------------- */

async function readDrafts(): Promise<Draft[]> {
  return readJson<Draft[]>(FILES.drafts, []);
}

export async function listDrafts(): Promise<Draft[]> {
  const drafts = await readDrafts();
  return drafts.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getDraft(id: string): Promise<Draft | null> {
  return (await readDrafts()).find((d) => d.id === id) ?? null;
}

/** Ingeplande posts, met normalisatie van oude drafts zonder scheduled_for. */
export async function listScheduled(): Promise<Draft[]> {
  return (await readDrafts())
    .filter((d) => d.status === "scheduled" && d.scheduled_for)
    .sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""));
}

/** Ingeplande posts waarvan de tijd verstreken is (klaar om live te gaan). */
export async function listDueScheduled(nowIso: string): Promise<Draft[]> {
  return (await listScheduled()).filter((d) => (d.scheduled_for ?? "") <= nowIso);
}

export async function createDraft(
  topic: string,
  source: "manual" | "autopilot"
): Promise<Draft> {
  return withLock(async () => {
    const draft: Draft = {
      id: randomUUID(),
      topic,
      title: null,
      slug: null,
      excerpt: null,
      content: null,
      meta_description: null,
      tags: null,
      image_url: null,
      image_prompt: null,
      status: "generating",
      source,
      error: null,
      published_post_id: null,
      published_at: null,
      scheduled_for: null,
      created_at: new Date().toISOString(),
    };
    const drafts = await readDrafts();
    drafts.push(draft);
    await writeJson(FILES.drafts, drafts);
    return draft;
  });
}

export async function updateDraft(
  id: string,
  patch: Partial<Draft>
): Promise<Draft> {
  return withLock(async () => {
    const drafts = await readDrafts();
    const index = drafts.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Draft niet gevonden");
    drafts[index] = { ...drafts[index], ...patch, id };
    await writeJson(FILES.drafts, drafts);
    return drafts[index];
  });
}

export async function deleteDraft(id: string): Promise<void> {
  return withLock(async () => {
    const drafts = await readDrafts();
    await writeJson(
      FILES.drafts,
      drafts.filter((d) => d.id !== id)
    );

    // Laat geen kans achter die naar een verdwenen draft wijst.
    const analysis = await readJson<Analysis | null>(FILES.analysis, null);
    const linked = analysis?.opportunities.filter((o) => o.draft_id === id) ?? [];
    if (analysis && linked.length > 0) {
      for (const item of linked) item.draft_id = null;
      await writeJson(FILES.analysis, analysis);
    }
  });
}

/* ----------------------------------- Log ----------------------------------- */

export async function log(
  kind: LogEntry["kind"],
  message: string,
  draftId?: string | null
): Promise<void> {
  await withLock(async () => {
    const entries = await readJson<LogEntry[]>(FILES.log, []);
    entries.unshift({
      id: randomUUID(),
      kind,
      message,
      draft_id: draftId ?? null,
      created_at: new Date().toISOString(),
    });
    await writeJson(FILES.log, entries.slice(0, 200));
  });
}

/* -------------------------------- Analyse ---------------------------------- */

export async function getAnalysis(): Promise<Analysis | null> {
  return readJson<Analysis | null>(FILES.analysis, null);
}

export async function saveAnalysis(analysis: Analysis): Promise<void> {
  await withLock(() => writeJson(FILES.analysis, analysis));
}

/** Koppelt een gegenereerde draft aan de kans waar hij uit voortkwam. */
export async function linkDraftToOpportunity(
  opportunityId: string,
  draftId: string
): Promise<void> {
  await withLock(async () => {
    const analysis = await readJson<Analysis | null>(FILES.analysis, null);
    if (!analysis) return;
    const item = analysis.opportunities.find((o: Opportunity) => o.id === opportunityId);
    if (!item) return;
    item.draft_id = draftId;
    await writeJson(FILES.analysis, analysis);
  });
}

export async function getLog(limit = 20): Promise<LogEntry[]> {
  const entries = await readJson<LogEntry[]>(FILES.log, []);
  return entries.slice(0, limit);
}

export async function lastAutopilotRun(): Promise<Date | null> {
  const entries = await readJson<LogEntry[]>(FILES.log, []);
  const entry = entries.find((e) => e.kind === "autopilot");
  return entry ? new Date(entry.created_at) : null;
}
