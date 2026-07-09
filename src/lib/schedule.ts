import { getSettings, listDueScheduled, log } from "./store";
import { publishScheduled } from "./publish";

export interface DuePublishResult {
  published: number;
  titles: string[];
  errors: string[];
}

/**
 * Publiceert alle ingeplande posts waarvan de tijd verstreken is. Wordt elk uur
 * aangeroepen door de scheduler/cron (dezelfde tick als de autopilot).
 */
export async function runDuePublishing(nowIso?: string): Promise<DuePublishResult> {
  const now = nowIso ?? new Date().toISOString();
  const due = await listDueScheduled(now);
  const result: DuePublishResult = { published: 0, titles: [], errors: [] };

  const settings = await getSettings();
  for (const draft of due) {
    try {
      await publishScheduled(draft, settings);
      result.published++;
      if (draft.title) result.titles.push(draft.title);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`${draft.title ?? draft.id}: ${message}`);
      await log("error", `Geplande publicatie mislukt voor "${draft.title}": ${message}`, draft.id);
    }
  }
  return result;
}
