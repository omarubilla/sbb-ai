import { randomUUID } from "node:crypto";
import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import {
  getProductSizeVariants,
  productsWithSizeVariants,
} from "../lib/constants/products-with-size-variants";

dotenv.config({ path: ".env.local" });

type SanityProduct = {
  _id: string;
  name: string;
  price?: number;
  sizeVariants?: Array<{ label?: string; price?: number }>;
};

function parseArgs(argv: string[]) {
  return {
    write: argv.includes("--write"),
  };
}

async function main() {
  const { write } = parseArgs(process.argv.slice(2));

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const token = process.env.SANITY_API_WRITE_TOKEN;

  if (!projectId || !dataset || !token) {
    throw new Error(
      "Missing Sanity env vars: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN",
    );
  }

  const client = createClient({
    projectId,
    dataset,
    token,
    useCdn: false,
    apiVersion: "2025-12-05",
  });

  const targetNames = [...new Set(productsWithSizeVariants)];
  const products = await client.fetch<SanityProduct[]>(
    '*[_type == "product" && name in $names]{_id, name, price, sizeVariants}',
    { names: targetNames },
  );

  console.log(`Target names in local config: ${targetNames.length}`);
  console.log(`Matched products in Sanity: ${products.length}`);

  const foundNames = new Set(products.map((p) => p.name));
  const missingNames = targetNames.filter((name) => !foundNames.has(name));
  if (missingNames.length > 0) {
    console.log("\nMissing in Sanity (name mismatch or not present):");
    for (const name of missingNames) {
      console.log(`- ${name}`);
    }
  }

  let patchCount = 0;
  for (const product of products) {
    const variants = getProductSizeVariants(product.name).map((variant) => ({
      _key: randomUUID().slice(0, 12),
      _type: "sizeVariant",
      label: variant.label,
      price: variant.price ?? product.price ?? 0,
    }));

    if (variants.length === 0) continue;

    const sameAsExisting =
      Array.isArray(product.sizeVariants) &&
      product.sizeVariants.length === variants.length &&
      product.sizeVariants.every((existing, idx) => {
        const next = variants[idx];
        return existing.label === next.label && existing.price === next.price;
      });

    if (sameAsExisting) continue;

    patchCount += 1;
    console.log(`Will patch: ${product.name}`);

    if (write) {
      await client
        .patch(product._id)
        .set({
          sizeVariants: variants,
        })
        .commit();
    }
  }

  if (!write) {
    console.log(`\nDry run complete. Products to patch: ${patchCount}`);
    console.log("Run with --write to apply mutations.");
    return;
  }

  console.log(`\nUpdated sizeVariants on ${patchCount} products.`);
}

main().catch((error) => {
  console.error("syncSizeVariantsToSanity failed:", error);
  process.exitCode = 1;
});
