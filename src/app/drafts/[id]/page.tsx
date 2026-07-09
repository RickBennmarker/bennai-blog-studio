import { notFound } from "next/navigation";
import { getDraft } from "@/lib/store";
import DraftEditor from "@/components/DraftEditor";

export const dynamic = "force-dynamic";

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const draft = await getDraft(id);
  if (!draft) notFound();
  return <DraftEditor initialDraft={draft} />;
}
