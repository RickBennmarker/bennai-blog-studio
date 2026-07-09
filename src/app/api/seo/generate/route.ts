import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, getSettings, linkDraftToOpportunity } from "@/lib/store";
import { generateDraft } from "@/lib/generate";

export const maxDuration = 600;

/** Genereert een blog vanuit een kans uit de keyword-analyse (inclusief SEO-brief). */
export async function POST(req: NextRequest) {
  try {
    const { opportunityId } = await req.json();
    if (!opportunityId) {
      return NextResponse.json({ error: "opportunityId ontbreekt" }, { status: 400 });
    }

    const analysis = await getAnalysis();
    const opportunity = analysis?.opportunities.find((o) => o.id === opportunityId);
    if (!opportunity) {
      return NextResponse.json({ error: "Kans niet gevonden" }, { status: 404 });
    }

    const settings = await getSettings();
    const draft = await generateDraft(opportunity.keyword, settings, "manual", {
      keyword: opportunity.keyword,
      title_suggestion: opportunity.title_suggestion,
      angle: opportunity.angle,
      outline: opportunity.outline,
      related_keywords: opportunity.related_keywords,
    });

    await linkDraftToOpportunity(opportunityId, draft.id);
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
