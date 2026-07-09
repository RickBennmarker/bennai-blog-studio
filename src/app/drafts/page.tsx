import Link from "next/link";
import { listDrafts } from "@/lib/store";
import StatusBadge from "@/components/StatusBadge";
import { IconImage, IconSparkles } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const drafts = (await listDrafts()).filter((d) => d.status !== "published");

  return (
    <div className="reveal">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drafts</h1>
          <p className="mt-1 text-sm text-muted">
            Door de agent geschreven — wachten op jouw review.
          </p>
        </div>
        <Link href="/new" className="btn-primary">
          <IconSparkles className="h-4 w-4" /> Nieuwe post
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="card mt-6 border-dashed p-10 text-center text-muted">
          Geen drafts. Alles is gepubliceerd of nog niet gegenereerd.
        </div>
      ) : (
        <div className="stagger mt-6 grid gap-4 sm:grid-cols-2">
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/drafts/${draft.id}`}
              className="card card-lift group overflow-hidden"
            >
              {draft.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.image_url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-surface-2 text-faint">
                  <IconImage className="h-8 w-8" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug group-hover:text-primary">
                    {draft.title ?? draft.topic}
                  </h2>
                  <StatusBadge status={draft.status} />
                </div>
                {draft.excerpt && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{draft.excerpt}</p>
                )}
                {draft.error && (
                  <p className="mt-2 line-clamp-2 text-xs text-danger">{draft.error}</p>
                )}
                <div className="mt-3 text-xs text-faint">
                  {new Date(draft.created_at).toLocaleString("nl-NL")} ·{" "}
                  {draft.source === "autopilot" ? "agent zelf" : "op verzoek"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
