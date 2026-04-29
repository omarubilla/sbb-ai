import { client } from "@/sanity/lib/client";
import { SeoControls } from "@/components/admin/SeoControls";
import { SeoRankingTable } from "@/components/admin/SeoRankingTable";

type ProductSeoRow = {
  _id: string;
  name: string;
  slug: string;
  southBayBio: number;
  ubpBio: number;
  rdSystems: number;
  lastCheckedAt: string | null;
};

const PRODUCT_SEO_TABLE_QUERY = `*[_type == "product" && !(name match "Bankful Test*")] | order(name asc){
  _id,
  name,
  "slug": slug.current,
  "southBayBio": coalesce(seoRankSouthBayBio, 0),
  "ubpBio": coalesce(seoRankUbpBio, 0),
  "rdSystems": coalesce(seoRankRdSystems, 0),
  "lastCheckedAt": seoLastCheckedAt
}`;

export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const products = await client.fetch<ProductSeoRow[]>(PRODUCT_SEO_TABLE_QUERY);
  const latestCheckedAt = products
    .map((product) => product.lastCheckedAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  const latestCheckedText = latestCheckedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(latestCheckedAt))
    : "Not refreshed yet";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          SEO Rankings
        </h1>
        <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
          Product-level Google ranking tracker by competitor. 0 means not found in tracked results.
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Last auto refresh: {latestCheckedText}
        </p>
      </div>

      <SeoControls initialLastRefresh={latestCheckedText} />

      <SeoRankingTable products={products} />
    </div>
  );
}
