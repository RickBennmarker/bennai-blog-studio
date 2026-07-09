import { NextRequest, NextResponse } from "next/server";
import { getDraft, updateDraft, deleteDraft } from "@/lib/store";
import type { Draft } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) {
    return NextResponse.json({ error: "Draft niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({ draft });
}

const EDITABLE = [
  "title",
  "slug",
  "excerpt",
  "content",
  "meta_description",
  "tags",
  "image_prompt",
] as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const patch: Partial<Draft> = {};
  for (const key of EDITABLE) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Niets om op te slaan" }, { status: 400 });
  }
  try {
    const draft = await updateDraft(id, patch);
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteDraft(id);
  return NextResponse.json({ ok: true });
}
