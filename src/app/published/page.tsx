import { listDrafts, getSettings } from "@/lib/store";
import { IconImage, IconExternal } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PublishedPage() {
  const settings = await getSettings();
  const siteUrl = settings.site_url.replace(/\/$/, "");
  const posts = (await listDrafts()).filter((d) => d.status === "published");

  return (
    <div className="reveal">
      <h1 className="text-2xl font-bold">Live</h1>
      <p className="mt-1 text-sm text-muted">
        Deze artikelen staan op {settings.site_url || "je website"}.
      </p>

      {posts.length === 0 ? (
        <div className="card mt-6 border-dashed p-10 text-center text-muted">
          Nog niets gepubliceerd.
        </div>
      ) : (
        <div className="stagger mt-6 space-y-2.5">
          {posts.map((post) => (
            <div key={post.id} className="card card-lift flex items-center gap-4 p-4">
              {post.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.image_url}
                  alt=""
                  className="h-14 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-surface-3 text-faint">
                  <IconImage className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{post.title}</div>
                <div className="mt-0.5 text-xs text-faint">
                  Live sinds{" "}
                  {post.published_at
                    ? new Date(post.published_at).toLocaleString("nl-NL")
                    : "—"}{" "}
                  · {post.source === "autopilot" ? "agent zelf" : "op verzoek"}
                </div>
              </div>
              {siteUrl && post.published_post_id ? (
                <a
                  href={`${siteUrl}/blog/${post.published_post_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="chip bg-success/15 text-success ring-1 ring-success/25 transition-colors hover:bg-success/25"
                >
                  Bekijk live <IconExternal className="h-3 w-3" />
                </a>
              ) : (
                <span className="chip bg-success/15 text-success ring-1 ring-success/25">
                  Live
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
