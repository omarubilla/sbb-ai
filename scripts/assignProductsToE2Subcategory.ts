import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const targetProductNames = [
  "His6-UBE2K, human recombinant",
  "UBE2D1 (Recombinant Human)",
  "UBE2D2 (Recombinant Human)",
  "UBE2D3 (Recombinant Human)",
  "UBE2L3 (Recombinant Human)",
] as const;

type SanityDocRef = { _id: string; name?: string; title?: string };
type SanityProduct = { _id: string; name: string; slug?: { current?: string } };

async function main() {
  const write = process.argv.includes("--write");

  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
    apiVersion: "2025-12-05",
  });

  const e2Subcategory = await client.fetch<SanityDocRef | null>(
    '*[_type == "subcategory" && slug.current == "e2s"][0]{_id, name}',
  );

  if (!e2Subcategory?._id) {
    throw new Error('Could not find subcategory with slug "e2s"');
  }

  const ubConjugationCategory = await client.fetch<SanityDocRef | null>(
    '*[_type == "category" && slug.current == "ub-conjugation"][0]{_id, title}',
  );

  if (!ubConjugationCategory?._id) {
    throw new Error('Could not find category with slug "ub-conjugation"');
  }

  const products = await client.fetch<SanityProduct[]>(
    '*[_type == "product" && name in $names]{_id, name, slug}',
    { names: targetProductNames },
  );

  const foundNames = new Set(products.map((product) => product.name));
  const missingNames = targetProductNames.filter((name) => !foundNames.has(name));

  console.log(`Target names: ${targetProductNames.length}`);
  console.log(`Matched products: ${products.length}`);

  if (missingNames.length > 0) {
    console.log("\nMissing exact matches:");
    for (const name of missingNames) {
      console.log(`- ${name}`);
    }
  }

  if (products.length === 0) {
    console.log("\nNo products matched. Nothing to update.");
    return;
  }

  console.log("\nProducts to assign to E2:");
  for (const product of products) {
    console.log(
      `- ${product.name}${product.slug?.current ? ` [slug: ${product.slug.current}]` : ""}`,
    );
  }

  if (!write) {
    console.log("\nDry run only. Re-run with --write to apply mutations.");
    return;
  }

  for (const product of products) {
    await client
      .patch(product._id)
      .set({
        category: {
          _type: "reference",
          _ref: ubConjugationCategory._id,
        },
        subcategory: {
          _type: "reference",
          _ref: e2Subcategory._id,
        },
      })
      .commit();
  }

  console.log(`\nUpdated ${products.length} product(s) to E2.`);
}

main().catch((error) => {
  console.error("assignProductsToE2Subcategory failed:", error);
  process.exitCode = 1;
});
