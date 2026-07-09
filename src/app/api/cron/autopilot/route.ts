import { NextRequest, NextResponse } from "next/server";
import { runAutopilot } from "@/lib/autopilot";
import { runDuePublishing } from "@/lib/schedule";

export const maxDuration = 300;

/**
 * Uurlijkse tick. Aangeroepen door scheduler.mjs (lokaal) of Vercel Cron.
 * Beveiligd met CRON_SECRET. Doet twee dingen:
 *  1. ingeplande posts publiceren waarvan de tijd verstreken is;
 *  2. de autopilot draaien (die beslist zelf of er iets moet gebeuren).
 * Met ?force=1 draait de autopilot direct, ongeacht schema (voor testen).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }
  try {
    const force = req.nextUrl.searchParams.get("force") === "1";
    const scheduled = await runDuePublishing();
    const autopilot = await runAutopilot(force);
    return NextResponse.json({ scheduled, autopilot });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
