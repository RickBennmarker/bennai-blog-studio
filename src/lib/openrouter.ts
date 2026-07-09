import { getSettings } from "./store";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Sleutel uit de instellingen (per gebruiker) met terugval op .env. */
async function apiKey(): Promise<string> {
  const fromSettings = (await getSettings()).openrouter_key?.trim();
  const key = fromSettings || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "Geen OpenRouter-sleutel. Vul die in bij de setup (of zet OPENROUTER_API_KEY in .env.local)."
    );
  }
  return key;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenRouter(body: Record<string, unknown>) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await apiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AI Blog Maker",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter fout (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

/** Tekstgeneratie via Claude (of ander model) op OpenRouter. */
export async function chat(
  model: string,
  messages: ChatMessage[],
  maxTokens = 8000
): Promise<string> {
  const data = await callOpenRouter({
    model,
    messages,
    max_tokens: maxTokens,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter gaf een leeg antwoord terug");
  }
  return content;
}

/** Vraag om JSON en parse het robuust (met of zonder ```json-codeblok). */
export async function chatJson<T>(
  model: string,
  messages: ChatMessage[],
  maxTokens = 8000
): Promise<T> {
  const raw = await chat(model, messages, maxTokens);
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Model gaf geen geldige JSON terug: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(stripped.slice(start, end + 1)) as T;
}

/**
 * Afbeelding genereren via OpenRouter (bijv. openai/gpt-image-1).
 * Geeft een PNG-buffer terug.
 */
export async function generateImage(
  model: string,
  prompt: string
): Promise<Buffer> {
  const data = await callOpenRouter({
    model,
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
  });
  const images = data?.choices?.[0]?.message?.images;
  const dataUrl: string | undefined = images?.[0]?.image_url?.url;
  if (!dataUrl) {
    throw new Error(
      "Geen afbeelding in het antwoord van OpenRouter. Controleer of het imagemodel beschikbaar is op je API key."
    );
  }
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return Buffer.from(base64, "base64");
}
