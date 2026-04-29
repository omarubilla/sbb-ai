import { client } from "@/sanity/lib/client";

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

      <div className="overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
        <div className="grid grid-cols-12 gap-4 border-b border-zinc-200/50 bg-zinc-50/50 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-400">
          <div className="col-span-6 sm:col-span-5">Product</div>
          <div className="col-span-2 text-center">South Bay Bio</div>
          <div className="col-span-2 text-center">UBP Bio</div>
          <div className="col-span-2 text-center">R&amp;D Systems</div>
          <div className="col-span-0 hidden sm:block" />
        </div>

        <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
          {products.map((product) => {
            return (
              <div
                key={product._id}
                className="grid grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
              >
                <div className="col-span-6 sm:col-span-5">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {product.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">/{product.slug}</p>
                </div>

                <div className="col-span-2 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {product.southBayBio}
                </div>
                <div className="col-span-2 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {product.ubpBio}
                </div>
                <div className="col-span-2 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {product.rdSystems}
                </div>
                <div className="col-span-0 hidden sm:block" />
              </div>
            );
          })}

          {products.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No Products Found</h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Add products in Sanity to start tracking ranking positions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
