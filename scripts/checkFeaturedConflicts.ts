import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
  apiVersion: "2025-12-05",
});

type ProductRow = {
  _id: string;
  name?: string;
  featured?: boolean;
  slug?: string;
};

async function main() {
  const rows = await client.fetch<ProductRow[]>(
    '*[_type == "product" && defined(featured)]{_id, name, featured, "slug": slug.current}',
  );

  const byBase = new Map<
    string,
    {
      published: ProductRow | null;
      draft: ProductRow | null;
    }
  >();

  for (const row of rows) {
    const isDraft = row._id.startsWith("drafts.");
    const baseId = isDraft ? row._id.slice(7) : row._id;
    const bucket = byBase.get(baseId) ?? { published: null, draft: null };
    if (isDraft) {
      bucket.draft = row;
    } else {
      bucket.published = row;
    }
    byBase.set(baseId, bucket);
  }

  const conflicts: Array<{
    baseId: string;
    name: string;
    slug?: string;
    publishedFeatured?: boolean;
    draftFeatured?: boolean;
    publishedId?: string;
    draftId?: string;
  }> = [];

  for (const [baseId, bucket] of byBase.entries()) {
    if (
      bucket.published &&
      bucket.draft &&
      bucket.published.featured !== bucket.draft.featured
    ) {
      conflicts.push({
        baseId,
        name: bucket.published.name ?? bucket.draft.name ?? "Unnamed",
        slug: bucket.published.slug ?? bucket.draft.slug,
        publishedFeatured: bucket.published.featured,
        draftFeatured: bucket.draft.featured,
        publishedId: bucket.published._id,
        draftId: bucket.draft._id,
      });
    }
  }

  const publishedFeatured = rows.filter(
    (row) => !row._id.startsWith("drafts.") && row.featured === true,
  );

  console.log(`featured_conflicts ${conflicts.length}`);
  for (const conflict of conflicts) {
    console.log(JSON.stringify(conflict));
  }
  console.log(`published_featured_count ${publishedFeatured.length}`);
}

main().catch((error) => {
  console.error("checkFeaturedConflicts failed:", error);
  process.exitCode = 1;
});
