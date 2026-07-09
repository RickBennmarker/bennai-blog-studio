import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/store";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const ALLOWED = [
  "setup_complete",
  "site_name",
  "site_url",
  "niche",
  "audience",
  "tone",
  "language",
  "extra_instructions",
  "openrouter_key",
  "text_model",
  "image_model",
  "image_style",
  "author",
  "cms_provider",
  "cms_config",
  "autopilot_enabled",
  "autopilot_interval_days",
  "autopilot_hour",
  "autopilot_publish_direct",
];

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
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
