import { NextRequest, NextResponse } from "next/server";
import { saveSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

/** Velden die de wizard mag opslaan bij het afronden van de setup. */
const ALLOWED: (keyof Settings)[] = [
  "site_name",
  "site_url",
  "niche",
  "audience",
  "tone",
  "language",
  "author",
  "extra_instructions",
  "openrouter_key",
  "cms_provider",
  "cms_config",
  "autopilot_enabled",
  "autopilot_interval_days",
  "autopilot_hour",
  "autopilot_publish_direct",
];

/** Rondt de setup af: slaat het profiel + de CMS-koppeling op en zet setup_complete. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = { setup_complete: true };
    for (const key of ALLOWED) {
      if (key in body) patch[key] = body[key];
    }
    const settings = await saveSettings(patch);
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
