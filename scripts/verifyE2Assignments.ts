import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const targetNames = [
  "His6-UBE2K, human recombinant",
  "UBE2D1 (Recombinant Human)",
  "UBE2D2 (Recombinant Human)",
  "UBE2D3 (Recombinant Human)",
  "UBE2L3 (Recombinant Human)",
] as const;

type AssignmentRow = {
  _id: string;
  name: string;
  categorySlug?: string;
  subcategorySlug?: string;
};

async function main() {
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
    apiVersion: "2025-12-05",
  });

  const rows = await client.fetch<AssignmentRow[]>(
    '*[_type == "product" && name in $names]{_id, name, "categorySlug": category->slug.current, "subcategorySlug": subcategory->slug.current}',
    { names: targetNames },
  );

  const notE2 = rows.filter(
    (row) =>
      row.categorySlug !== "ub-conjugation" || row.subcategorySlug !== "e2s",
  );

  console.log(`Matched docs: ${rows.length}`);
  console.log(`Not in ub-conjugation/e2s: ${notE2.length}`);

  if (notE2.length > 0) {
    console.log("\nNon-E2 assignments:");
    for (const row of notE2) {
      console.log(
        `- ${row.name} | id=${row._id} | category=${row.categorySlug ?? "none"} | subcategory=${row.subcategorySlug ?? "none"}`,
      );
    }
  }
}

main().catch((error) => {
  console.error("verifyE2Assignments failed:", error);
  process.exitCode = 1;
});
