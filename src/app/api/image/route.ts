import { NextRequest, NextResponse } from "next/server";
import { getDraft, updateDraft, getSettings } from "@/lib/store";
import { generateAndUploadImage } from "@/lib/images";

export const maxDuration = 300;

/** (Her)genereer de afbeelding van een draft, optioneel met aangepaste prompt. */
export async function POST(req: NextRequest) {
  try {
    const { draftId, prompt } = await req.json();
    if (!draftId) {
      return NextResponse.json({ error: "draftId ontbreekt" }, { status: 400 });
    }
    const draft = await getDraft(draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft niet gevonden" }, { status: 404 });
    }
    const settings = await getSettings();
    const imagePrompt = (prompt as string) || draft.image_prompt || draft.topic;

    const imageUrl = await generateAndUploadImage(
      imagePrompt,
      draft.slug || "post",
      settings
    );
    const updated = await updateDraft(draftId, {
      image_url: imageUrl,
      image_prompt: imagePrompt,
      error: null,
    });
    return NextResponse.json({ draft: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
