import { NextRequest, NextResponse } from "next/server";
import { getDraft, getSettings } from "@/lib/store";
import { scheduleDraft, unscheduleDraft } from "@/lib/publish";

export const maxDuration = 60;

/** Plant een draft in (push als concept naar Lovable + geplande tijd). */
export async function POST(req: NextRequest) {
  try {
    const { draftId, scheduledFor } = await req.json();
    if (!draftId || !scheduledFor) {
      return NextResponse.json(
        { error: "draftId en scheduledFor zijn verplicht" },
        { status: 400 }
      );
    }
    const when = new Date(scheduledFor);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Ongeldige datum/tijd" }, { status: 400 });
    }
    if (when.getTime() < Date.now() - 60_000) {
      return NextResponse.json(
        { error: "Kies een tijdstip in de toekomst" },
        { status: 400 }
      );
    }
    const draft = await getDraft(draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft niet gevonden" }, { status: 404 });
    }
    if (draft.status === "published") {
      return NextResponse.json(
        { error: "Deze post is al gepubliceerd" },
        { status: 400 }
      );
    }
    const settings = await getSettings();
    const slug = await scheduleDraft(draft, settings, when.toISOString());
    return NextResponse.json({ ok: true, slug, scheduledFor: when.toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Haalt een draft uit de planning. */
export async function DELETE(req: NextRequest) {
  try {
    const { draftId } = await req.json();
    const draft = draftId ? await getDraft(draftId) : null;
    if (!draft) {
      return NextResponse.json({ error: "Draft niet gevonden" }, { status: 404 });
    }
    await unscheduleDraft(draft);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
