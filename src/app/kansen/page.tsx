import { getAnalysis } from "@/lib/store";
import { hasDataForSeo } from "@/lib/seo/keywords";
import OpportunitiesView from "@/components/OpportunitiesView";

export const dynamic = "force-dynamic";

export default async function KansenPage() {
  const analysis = await getAnalysis();
  return <OpportunitiesView initialAnalysis={analysis} dataForSeo={hasDataForSeo()} />;
}
