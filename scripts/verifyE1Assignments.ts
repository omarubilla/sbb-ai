import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const targetNames = [
  "Ubiquitin Activating Enzyme (UBA1), human recombinant",
  "Ubiquitin Activating Enzyme (UBA1), human recombinant (His-tagged)",
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

  const notE1 = rows.filter(
    (row) =>
      row.categorySlug !== "ub-conjugation" || row.subcategorySlug !== "e1s",
  );

  console.log(`Matched docs: ${rows.length}`);
  console.log(`Not in ub-conjugation/e1s: ${notE1.length}`);

  if (notE1.length > 0) {
    console.log("\nNon-E1 assignments:");
    for (const row of notE1) {
      console.log(
        `- ${row.name} | id=${row._id} | category=${row.categorySlug ?? "none"} | subcategory=${row.subcategorySlug ?? "none"}`,
      );
    }
  }
}

main().catch((error) => {
  console.error("verifyE1Assignments failed:", error);
  process.exitCode = 1;
});
