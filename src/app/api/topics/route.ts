import { NextResponse } from "next/server";
import { getSettings } from "@/lib/store";
import { suggestTopics } from "@/lib/writer";
import { getExistingTitles } from "@/lib/publish";

export const maxDuration = 120;

export async function POST() {
  try {
    const settings = await getSettings();
    const existingTitles = await getExistingTitles();
    const topics = await suggestTopics(settings, existingTitles, 6);
    return NextResponse.json({ topics });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
