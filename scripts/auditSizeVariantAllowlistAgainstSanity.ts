import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import {
  SIZE_VARIANT_ALLOWLIST,
  SIZE_VARIANT_ALLOWLIST_BY_CATEGORY,
} from "../lib/constants/size-variant-allowlist-by-category";

dotenv.config({ path: ".env.local" });

type SanityProduct = {
  _id: string;
  name: string;
  slug?: { current?: string };
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokenSet(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

function similarityScore(source: string, target: string): number {
  const sourceNormalized = normalize(source);
  const targetNormalized = normalize(target);

  if (sourceNormalized === targetNormalized) return 100;
  if (
    sourceNormalized.includes(targetNormalized) ||
    targetNormalized.includes(sourceNormalized)
  ) {
    return 90;
  }

  const sourceTokens = tokenSet(source);
  const targetTokens = tokenSet(target);
  const common = [...sourceTokens].filter((token) => targetTokens.has(token)).length;
  return Math.round((common / Math.max(sourceTokens.size, 1)) * 100);
}

async function main() {
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
    apiVersion: "2025-12-05",
  });

  const allowlist = [...new Set(SIZE_VARIANT_ALLOWLIST)];

  const exact = await client.fetch<SanityProduct[]>(
    '*[_type == "product" && name in $names]{_id, name, slug}',
    { names: allowlist },
  );

  const allProducts = await client.fetch<SanityProduct[]>(
    '*[_type == "product"]{_id, name, slug}',
  );

  const exactNameSet = new Set(exact.map((product) => product.name));
  const missing = allowlist.filter((name) => !exactNameSet.has(name));

  const probableMismatches = missing.map((missingName) => {
    const topMatches = allProducts
      .map((product) => ({
        name: product.name,
        slug: product.slug?.current ?? "",
        score: similarityScore(missingName, product.name),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      missingName,
      topMatches,
    };
  });

  console.log("== Allowlist Categories ==");
  for (const [category, names] of Object.entries(SIZE_VARIANT_ALLOWLIST_BY_CATEGORY)) {
    console.log(`- ${category}: ${names.length}`);
  }

  console.log(`\nAllowlist total (unique): ${allowlist.length}`);
  console.log(`Exact matches in Sanity: ${exact.length}`);
  console.log(`Missing exact matches: ${missing.length}`);

  console.log("\n== Missing or Incorrect (exact-name) ==");
  for (const item of probableMismatches) {
    console.log(`\nMISSING: ${item.missingName}`);
    for (const candidate of item.topMatches) {
      console.log(
        `  -> (${candidate.score}) ${candidate.name}${
          candidate.slug ? ` [slug: ${candidate.slug}]` : ""
        }`,
      );
    }
  }
}

main().catch((error) => {
  console.error("auditSizeVariantAllowlistAgainstSanity failed:", error);
  process.exitCode = 1;
});
