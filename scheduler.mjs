/**
 * Lokale autopilot-scheduler.
 *
 * Draai naast de dev-server:  npm run scheduler
 * Pingt elk uur (om :05) de cron-route; die beslist zelf of er op dat moment
 * een post gegenereerd moet worden (o.b.v. je instellingen in het dashboard).
 *
 * Online op Vercel? Dan is dit script niet nodig — vercel.json regelt de cron.
 */
import cron from "node-cron";
import { readFileSync } from "node:fs";

// .env.local inlezen (zonder extra dependency)
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  console.error("Kon .env.local niet lezen — draai dit vanuit de projectmap.");
  process.exit(1);
}

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const SECRET = process.env.CRON_SECRET;
if (!SECRET) {
  console.error("CRON_SECRET ontbreekt in .env.local");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(`${APP_URL}/api/cron/autopilot`, {
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const data = await res.json();
    const stamp = new Date().toLocaleString("nl-NL");
    if (data.ran) {
      console.log(`[${stamp}] ✅ Autopilot: "${data.title}" (${data.published ? "gepubliceerd" : "draft"})`);
    } else {
      console.log(`[${stamp}] ⏭  ${data.reason ?? data.error ?? "geen actie"}`);
    }
  } catch (err) {
    console.error(`[${new Date().toLocaleString("nl-NL")}] ⚠️  ${err.message} — draait de dev-server (npm run dev)?`);
  }
}

console.log(`AI Blog Maker scheduler gestart — checkt elk uur via ${APP_URL}`);
tick();
cron.schedule("5 * * * *", tick);
