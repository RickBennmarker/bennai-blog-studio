import { NextResponse } from "next/server";
import { testBlogConnection } from "@/lib/publish";

/** Verbindingstest met de Lovable blog-publish API. */
export async function GET() {
  try {
    const count = await testBlogConnection();
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
