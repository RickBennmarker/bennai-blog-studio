import { NextRequest, NextResponse } from "next/server";
import { analyzeCompany } from "@/lib/setup/extract";
import { saveSettings } from "@/lib/store";

export const maxDuration = 120;

/**
 * Analyseert een bedrijfs-URL en geeft een voorgevuld profiel + gedetecteerd
 * CMS + recente blogs terug. Slaat de OpenRouter-sleutel en site-URL alvast op
 * zodat de generatie- en scanfuncties daarna werken.
 */
export async function POST(req: NextRequest) {
  try {
    const { url, openrouterKey } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Vul een geldige website-URL in." }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (typeof openrouterKey === "string" && openrouterKey.trim()) {
      patch.openrouter_key = openrouterKey.trim();
    }
    if (Object.keys(patch).length) await saveSettings(patch);

    const result = await analyzeCompany(url);
    await saveSettings({ site_url: result.site_url });
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
