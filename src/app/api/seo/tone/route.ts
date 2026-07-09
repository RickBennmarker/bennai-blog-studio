import { NextResponse } from "next/server";
import { scanToneOfVoice } from "@/lib/seo/tone";

export const maxDuration = 120;

/** Scant de site en geeft een voorgestelde tone-of-voice terug. */
export async function POST() {
  try {
    const tone = await scanToneOfVoice();
    return NextResponse.json({ tone });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
