import { NextRequest, NextResponse } from "next/server";
import { getDraft, getSettings } from "@/lib/store";
import { publishDraft, publishScheduled } from "@/lib/publish";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { draftId } = await req.json();
    if (!draftId) {
      return NextResponse.json({ error: "draftId ontbreekt" }, { status: 400 });
    }
    const draft = await getDraft(draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft niet gevonden" }, { status: 404 });
    }
    if (draft.status === "published") {
      return NextResponse.json(
        { error: "Deze draft is al gepubliceerd" },
        { status: 400 }
      );
    }
    const settings = await getSettings();

    // Ingeplande posts staan al als concept in Lovable → dat concept live zetten
    // (PATCH), niet opnieuw aanmaken (dat gaf een duplicate-slug fout).
    if (draft.status === "scheduled" || draft.published_post_id) {
      await publishScheduled(draft, settings);
      return NextResponse.json({ ok: true, slug: draft.published_post_id });
    }

    const slug = await publishDraft(draft, settings);
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
