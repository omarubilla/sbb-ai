import fs from "node:fs";
import { createClient } from "@sanity/client";

const env = fs.readFileSync(".env.local", "utf8");

function getEnv(key) {
  const match = env.match(new RegExp(`^${key}="?([^\n"]+)"?`, "m"));
  return match?.[1];
}

const projectId = getEnv("NEXT_PUBLIC_SANITY_PROJECT_ID") ?? "y5o7s0vz";
const dataset = getEnv("NEXT_PUBLIC_SANITY_DATASET") ?? "production";
const token = getEnv("SANITY_API_WRITE_TOKEN");

if (!token) {
  console.error("Missing SANITY_API_WRITE_TOKEN in .env.local");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2025-12-05",
  token,
  useCdn: false,
});

const E1_PRODUCT_NAMES = new Set([
  "Ubiquitin Activating Enzyme (UBA1), human recombinant",
  "Ubiquitin Activating Enzyme (UBA1), human recombinant (His-tagged)",
]);

function looksLikeE1Subcategory(subcategory) {
  return /(^|\b)e1s?(\b|$)/i.test(subcategory.title) || /^e1s?$/i.test(subcategory.slug ?? "");
}

function looksLikeE2Subcategory(subcategory) {
  return /(^|\b)e2s?(\b|$)/i.test(subcategory.title) || /^e2s?$/i.test(subcategory.slug ?? "");
}

function looksLikeCombinedE1E2(subcategory) {
  return /e1/i.test(subcategory.title) && /e2/i.test(subcategory.title);
}

async function ensureSubcategories() {
  const subcategories = await client.fetch(
    '*[_type == "subcategory" && category._ref == "category-ub-conjugation"]{_id, title, "slug": slug.current}',
  );

  let e1 = subcategories.find(looksLikeE1Subcategory);
  let e2 = subcategories.find(looksLikeE2Subcategory);
  const combined = subcategories.find(looksLikeCombinedE1E2);

  if (!e1) {
    e1 = await client.createIfNotExists({
      _id: "subcategory-e1s",
      _type: "subcategory",
      title: "E1s",
      slug: { _type: "slug", current: "e1s" },
      category: { _type: "reference", _ref: "category-ub-conjugation" },
    });
  }

  if (!e2) {
    e2 = await client.createIfNotExists({
      _id: "subcategory-e2s",
      _type: "subcategory",
      title: "E2s",
      slug: { _type: "slug", current: "e2s" },
      category: { _type: "reference", _ref: "category-ub-conjugation" },
    });
  }

  return { e1, e2, combined };
}

async function splitAssignments() {
  const { e1, e2, combined } = await ensureSubcategories();

  const products = await client.fetch(
    '*[_type == "product" && category._ref == "category-ub-conjugation"]{_id, name, "subcategoryId": subcategory._ref}',
  );

  const tx = client.transaction();
  const movedToE1 = [];
  const movedToE2 = [];

  for (const product of products) {
    if (E1_PRODUCT_NAMES.has(product.name)) {
      tx.patch(product._id, {
        set: { subcategory: { _type: "reference", _ref: e1._id } },
      });
      movedToE1.push(product.name);
      continue;
    }

    const belongsToEGroup =
      product.subcategoryId === combined?._id ||
      product.subcategoryId === e1._id ||
      product.subcategoryId === e2._id;

    if (belongsToEGroup) {
      tx.patch(product._id, {
        set: { subcategory: { _type: "reference", _ref: e2._id } },
      });
      movedToE2.push(product.name);
    }
  }

  const commitResult = await tx.commit({ visibility: "sync" });

  const e1Products = await client.fetch(
    '*[_type == "product" && category._ref == "category-ub-conjugation" && subcategory._ref == $subcategoryId]|order(name asc){name}',
    { subcategoryId: e1._id },
  );

  return {
    e1,
    e2,
    combined,
    movedToE1,
    movedToE2,
    e1Products,
    transactionId: commitResult.transactionId,
  };
}

try {
  const result = await splitAssignments();

  console.log(`E1 subcategory: ${result.e1._id} (${result.e1.title})`);
  console.log(`E2 subcategory: ${result.e2._id} (${result.e2.title})`);
  console.log(
    `Combined subcategory found: ${result.combined ? `${result.combined._id} (${result.combined.title})` : "none"}`,
  );
  console.log(`Moved to E1: ${result.movedToE1.length}`);
  for (const name of result.movedToE1) {
    console.log(`  - ${name}`);
  }
  console.log(`Moved to E2: ${result.movedToE2.length}`);
  console.log(`Transaction ID: ${result.transactionId}`);
  console.log(`Final E1 product count: ${result.e1Products.length}`);
  for (const product of result.e1Products) {
    console.log(`  * ${product.name}`);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
