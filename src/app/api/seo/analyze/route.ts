import { NextResponse } from "next/server";
import { runAnalysis } from "@/lib/seo/analyze";
import { getAnalysis } from "@/lib/store";
import { hasDataForSeo } from "@/lib/seo/keywords";

export const maxDuration = 600;

/** Laatste analyse ophalen. */
export async function GET() {
  const analysis = await getAnalysis();
  return NextResponse.json({ analysis, dataforseo: hasDataForSeo() });
}

/** Nieuwe analyse draaien (crawl → keywords → clustering → kansen). */
export async function POST() {
  try {
    const analysis = await runAnalysis();
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
