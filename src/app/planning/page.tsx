import { listScheduled, listDrafts } from "@/lib/store";
import PlanningView from "@/components/PlanningView";

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const [scheduled, allDrafts] = await Promise.all([listScheduled(), listDrafts()]);
  // Concepten die nog niet ingepland zijn — die kun je vanaf hier plannen.
  const unplanned = allDrafts.filter((d) => d.status === "draft");
  return (
    <PlanningView
      scheduled={scheduled.map((d) => ({
        id: d.id,
        title: d.title ?? d.topic,
        scheduled_for: d.scheduled_for!,
      }))}
      unplanned={unplanned.map((d) => ({ id: d.id, title: d.title ?? d.topic }))}
    />
  );
}
