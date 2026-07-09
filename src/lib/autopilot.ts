import { getSettings, log, lastAutopilotRun } from "./store";
import { pickAutopilotTopic } from "./writer";
import { generateDraft } from "./generate";
import { publishDraft, getExistingTitles } from "./publish";

export interface AutopilotResult {
  ran: boolean;
  reason: string;
  draftId?: string;
  title?: string;
  published?: boolean;
}

/**
 * Eén autopilot-run. Wordt elk uur aangeroepen door de scheduler (of Vercel
 * Cron); beslist zelf of er iets moet gebeuren op basis van de instellingen.
 */
export async function runAutopilot(force = false): Promise<AutopilotResult> {
  const settings = await getSettings();

  if (!settings.autopilot_enabled && !force) {
    return { ran: false, reason: "Autopilot staat uit" };
  }

  if (!force) {
    const now = new Date();
    if (now.getHours() !== settings.autopilot_hour) {
      return {
        ran: false,
        reason: `Niet het ingestelde uur (${settings.autopilot_hour}:00)`,
      };
    }
    const last = await lastAutopilotRun();
    if (last) {
      const daysSince = (now.getTime() - last.getTime()) / 86_400_000;
      // Kleine marge zodat een run van 9:05 een run om 9:00 n dagen later niet blokkeert.
      if (daysSince < settings.autopilot_interval_days - 0.1) {
        return {
          ran: false,
          reason: `Laatste run ${daysSince.toFixed(1)} dagen geleden, interval is ${settings.autopilot_interval_days} dagen`,
        };
      }
    }
  }

  const existingTitles = await getExistingTitles();
  const topic = await pickAutopilotTopic(settings, existingTitles);
  const draft = await generateDraft(topic, settings, "autopilot");

  let published = false;
  if (settings.autopilot_publish_direct) {
    await publishDraft(draft, settings);
    published = true;
  }

  await log(
    "autopilot",
    published
      ? `Autopilot publiceerde: "${draft.title}"`
      : `Autopilot zette draft klaar voor review: "${draft.title}"`,
    draft.id
  );

  return {
    ran: true,
    reason: "OK",
    draftId: draft.id,
    title: draft.title ?? undefined,
    published,
  };
}
