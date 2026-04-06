import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const unmatchedNames = [
  "His-UBE2S  (Recombinant Human) (His-tagged)",
  "His-UBE2A  (Recombinant Human) (His-tagged)",
  "His-UBE2B  (Recombinant Human) (His-tagged)",
  "His-UBE2C  (Recombinant Human) (His-tagged)",
  "His-UBE2D4  (Recombinant Human) (His-tagged)",
  "UBE2N/UBE2V1 Complex (Recombinant Human) (untagged)",
  "UBE2I (Recombinant Human) (untagged)",
  "UBE2M (Recombinant Human) (untagged)",
  "His8- Avi-DDB1-biotinylated",
  "Skp1/His6-Skp2",
  "DDB1/Cereblon (CRBN)",
  "UBE2L3, human recombinant",
  "UBE2D3, human recombinant",
  "UBE2D2, human recombinant",
  "UBE2D1, human recombinant",
];

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
  if (sourceNormalized.includes(targetNormalized) || targetNormalized.includes(sourceNormalized)) {
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

  const sanityProducts = await client.fetch<Array<{ name: string; slug?: { current?: string } }>>(
    '*[_type == "product"]{name, slug}',
  );

  console.log(`Total product docs in Sanity: ${sanityProducts.length}`);

  for (const unmatched of unmatchedNames) {
    const ranked = sanityProducts
      .map((product) => ({
        name: product.name,
        slug: product.slug?.current ?? "",
        score: similarityScore(unmatched, product.name),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    console.log(`\nUNMATCHED: ${unmatched}`);
    for (const candidate of ranked) {
      console.log(
        `  - (${candidate.score}) ${candidate.name}${
          candidate.slug ? ` [slug: ${candidate.slug}]` : ""
        }`,
      );
    }
  }
}

main().catch((error) => {
  console.error("diagnoseUnmatchedSizeVariantNames failed:", error);
  process.exitCode = 1;
});
