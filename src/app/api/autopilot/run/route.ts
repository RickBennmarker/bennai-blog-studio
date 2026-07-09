import { NextResponse } from "next/server";
import { runAutopilot } from "@/lib/autopilot";

export const maxDuration = 300;

/**
 * Handmatige autopilot-run vanuit het dashboard (testknop).
 * Draait direct, ongeacht schema.
 */
export async function POST() {
  try {
    const result = await runAutopilot(true);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
