import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type CoaRow = {
  productName: string;
  coaUrl: string;
  pageUrl?: string;
};

type SanityProduct = {
  _id: string;
  name: string;
  slug?: { current?: string };
  certificateOfAnalysisUrl?: string;
};

const INPUT_PATH = path.resolve("data/coa-links-with-ids.json");

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\bisg15\b/g, "isg")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_–—-]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSlugFromPageUrl(url?: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    return "";
  }
}

function scoreMatch(source: CoaRow, candidate: SanityProduct): number {
  const sourceName = normalizeText(source.productName);
  const sourceSlug = normalizeText(getSlugFromPageUrl(source.pageUrl));
  const targetName = normalizeText(candidate.name);
  const targetSlug = normalizeText(candidate.slug?.current ?? "");

  if (!sourceName || !targetName) return 0;

  if (sourceName === targetName) return 100;
  if (sourceSlug && targetSlug && sourceSlug === targetSlug) return 95;

  let score = 0;

  if (sourceSlug && targetSlug && (targetSlug.includes(sourceSlug) || sourceSlug.includes(targetSlug))) {
    score = Math.max(score, 85);
  }

  if (targetName.includes(sourceName) || sourceName.includes(targetName)) {
    score = Math.max(score, 80);
  }

  const sourceTokens = new Set(sourceName.split(" ").filter(Boolean));
  const targetTokens = new Set(targetName.split(" ").filter(Boolean));
  const intersection = [...sourceTokens].filter((t) => targetTokens.has(t)).length;
  const overlap = intersection / Math.max(sourceTokens.size, 1);
  if (overlap >= 0.75) {
    score = Math.max(score, 70);
  }

  return score;
}

function parseArgs(argv: string[]): { dryRun: boolean } {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs(process.argv);

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const token = process.env.SANITY_API_WRITE_TOKEN;

  if (!projectId || !dataset || !token) {
    throw new Error("Missing Sanity env vars: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN");
  }

  const client = createClient({
    projectId,
    dataset,
    token,
    useCdn: false,
    apiVersion: "2025-12-05",
  });

  const inputRaw = await fs.readFile(INPUT_PATH, "utf8");
  const rows = JSON.parse(inputRaw) as CoaRow[];

  const byProduct = new Map<string, CoaRow[]>();
  for (const row of rows) {
    const key = normalizeText(row.productName);
    if (!key || !row.coaUrl) continue;
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key)!.push(row);
  }

  const sourceProducts = [...byProduct.values()].map((bucket) => {
    const urls = [...new Set(bucket.map((r) => r.coaUrl))];
    return {
      productName: bucket[0].productName,
      pageUrl: bucket[0].pageUrl,
      coaUrl: urls[0],
      allCoaUrls: urls,
    };
  });

  const sanityProducts = await client.fetch<SanityProduct[]>(
    '*[_type == "product"]{_id, name, slug, certificateOfAnalysisUrl}'
  );

  const patches: Array<{ id: string; coaUrl: string; sourceName: string; score: number }> = [];
  const unmatched: string[] = [];

  for (const source of sourceProducts) {
    const scored = sanityProducts
      .map((candidate) => ({
        candidate,
        score: scoreMatch(source, candidate),
      }))
      .filter((row) => row.score >= 70)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      unmatched.push(source.productName);
      continue;
    }

    const topScore = scored[0].score;
    const topMatches = scored.filter((row) => row.score === topScore);

    for (const match of topMatches) {
      patches.push({
        id: match.candidate._id,
        coaUrl: source.coaUrl,
        sourceName: source.productName,
        score: match.score,
      });
    }
  }

  const dedupPatches = new Map<string, { coaUrl: string; sourceName: string; score: number }>();
  for (const patch of patches) {
    const existing = dedupPatches.get(patch.id);
    if (!existing || patch.score > existing.score) {
      dedupPatches.set(patch.id, {
        coaUrl: patch.coaUrl,
        sourceName: patch.sourceName,
        score: patch.score,
      });
    }
  }

  const finalPatches = [...dedupPatches.entries()].map(([id, value]) => ({ id, ...value }));

  console.log(`Source products in CoA file: ${sourceProducts.length}`);
  console.log(`Sanity products: ${sanityProducts.length}`);
  console.log(`Matched Sanity docs to patch: ${finalPatches.length}`);
  console.log(`Unmatched source products: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log("\nUnmatched (first 20):");
    for (const name of unmatched.slice(0, 20)) {
      console.log(`- ${name}`);
    }
  }

  if (dryRun) {
    console.log("\nDry run only. No mutations were sent.");
    return;
  }

  for (const patch of finalPatches) {
    await client.patch(patch.id).set({ certificateOfAnalysisUrl: patch.coaUrl }).commit();
  }

  console.log(`\nUpdated certificateOfAnalysisUrl on ${finalPatches.length} Sanity documents.`);
}

main().catch((error) => {
  console.error("syncCoaToSanity failed:", error);
  process.exitCode = 1;
});
