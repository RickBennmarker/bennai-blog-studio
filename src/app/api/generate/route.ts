import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/store";
import { generateDraft } from "@/lib/generate";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        { error: "Geef een onderwerp op" },
        { status: 400 }
      );
    }
    const settings = await getSettings();
    const draft = await generateDraft(topic.trim(), settings, "manual");
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
