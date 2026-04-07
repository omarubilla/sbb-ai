import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type ProductRow = {
  _id: string;
  name?: string;
  slug?: string;
  featured?: boolean;
  stock?: number;
  description?: string;
  imageUrl?: string;
  certificateOfAnalysisUrl?: string;
  images?: Array<{ asset?: { url?: string | null } | null }>;
};

function normalizeSlugKey(value?: string | null) {
  const clean = (value ?? "").trim().replace(/^\/+/, "").toLowerCase();
  return clean;
}

function normalizeNameKey(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalKey(product: ProductRow) {
  const slugKey = normalizeSlugKey(product.slug);
  if (slugKey) return `slug:${slugKey}`;
  return `name:${normalizeNameKey(product.name)}`;
}

function qualityScore(product: ProductRow) {
  let score = 0;
  const slug = (product.slug ?? "").trim();

  if (slug && !slug.startsWith("/")) score += 20;
  if (product.featured === true) score += 10;
  if ((product.images?.[0]?.asset?.url ?? "").trim()) score += 6;
  if ((product.imageUrl ?? "").trim()) score += 3;
  if ((product.description ?? "").trim()) score += 2;
  if ((product.certificateOfAnalysisUrl ?? "").trim()) score += 2;
  if (typeof product.stock === "number" && product.stock > 0) score += 2;

  return score;
}

async function main() {
  const write = process.argv.includes("--write");

  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
    apiVersion: "2025-12-05",
  });

  const publishedProducts = await client.fetch<ProductRow[]>(
    `*[_type == "product" && !(_id in path("drafts.**"))]{
      _id,
      name,
      "slug": slug.current,
      featured,
      stock,
      description,
      imageUrl,
      certificateOfAnalysisUrl,
      "images": images[0...1]{asset->{url}}
    }`,
  );

  const grouped = new Map<string, ProductRow[]>();
  for (const product of publishedProducts) {
    const key = canonicalKey(product);
    const bucket = grouped.get(key) ?? [];
    bucket.push(product);
    grouped.set(key, bucket);
  }

  const duplicateGroups = [...grouped.values()].filter((group) => group.length > 1);

  console.log(`duplicate_groups ${duplicateGroups.length}`);
  if (duplicateGroups.length === 0) {
    console.log("No duplicate groups found. Nothing to do.");
    return;
  }

  let canonicalPatched = 0;
  let deleted = 0;
  let archived = 0;

  for (const group of duplicateGroups) {
    const sorted = [...group].sort((a, b) => {
      const scoreDiff = qualityScore(b) - qualityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a._id.localeCompare(b._id);
    });

    const canonical = sorted[0];
    const duplicates = sorted.slice(1);
    const desiredFeatured = group.some((product) => product.featured === true);
    const canonicalSlug = normalizeSlugKey(canonical.slug);

    console.log("---");
    console.log(`canonical ${canonical.name ?? "Unnamed"} | id=${canonical._id} | slug=${canonical.slug ?? "none"}`);
    console.log(`desired_featured ${desiredFeatured}`);

    if (!write) {
      for (const duplicate of duplicates) {
        console.log(
          `duplicate ${duplicate.name ?? "Unnamed"} | id=${duplicate._id} | slug=${duplicate.slug ?? "none"}`,
        );
      }
      continue;
    }

    await client
      .patch(canonical._id)
      .set({
        featured: desiredFeatured,
        slug: {
          _type: "slug",
          current: canonicalSlug || normalizeNameKey(canonical.name),
        },
      })
      .commit();
    canonicalPatched += 1;

    for (const duplicate of duplicates) {
      const refs = await client.fetch<Array<{ _id: string; _type: string }>>(
        '*[_id != $id && references($id)][0...20]{_id,_type}',
        { id: duplicate._id },
      );

      if (refs.length === 0) {
        await client.delete(duplicate._id);
        deleted += 1;
        console.log(`deleted ${duplicate._id}`);
        continue;
      }

      const archivedSlug = `archived-duplicate-${canonicalSlug || normalizeNameKey(duplicate.name)}-${duplicate._id.slice(0, 8)}`;

      await client
        .patch(duplicate._id)
        .set({
          featured: false,
          stock: 0,
          slug: {
            _type: "slug",
            current: archivedSlug,
          },
          name: `${duplicate.name ?? "Unnamed"} [Archived Duplicate]`,
        })
        .commit();

      archived += 1;
      console.log(`archived ${duplicate._id} (referenced by ${refs.length} doc(s))`);
    }
  }

  if (!write) {
    console.log("\nDry run only. Re-run with --write to apply dedupe.");
    return;
  }

  console.log("\nDone.");
  console.log(`canonical_patched ${canonicalPatched}`);
  console.log(`deleted_duplicates ${deleted}`);
  console.log(`archived_duplicates ${archived}`);
}

main().catch((error) => {
  console.error("dedupeFeaturedProducts failed:", error);
  process.exitCode = 1;
});
