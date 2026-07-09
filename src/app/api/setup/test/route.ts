import { NextRequest, NextResponse } from "next/server";
import { buildProvider } from "@/lib/cms";
import type { CmsConfig, CmsProviderId } from "@/lib/types";

export const maxDuration = 60;

/**
 * Test een CMS-koppeling met de meegegeven provider + config, zónder ze op te
 * slaan. Zo kan de wizard direct "verbonden ✓ (N posts)" tonen.
 */
export async function POST(req: NextRequest) {
  try {
    const { provider, config } = (await req.json()) as {
      provider: CmsProviderId;
      config: CmsConfig;
    };
    const count = await buildProvider(provider, config ?? {}).testConnection();
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
