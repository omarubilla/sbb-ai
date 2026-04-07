import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PRODUCT_NAME = "Ubiquitin, human recombinant";
const PRODUCT_SLUG = "ubiquitin-human-recombinant";
const PRODUCT_DOC_ID = `product-${PRODUCT_SLUG}`;

const PRODUCT_DESCRIPTION =
  "Ubiquitin, human recombinant, is a small (8.5 kDa) regulatory protein found in most eukaryotic tissues. Ubiquitination can signal protein degradation via the proteasome, alter cellular localization, affect activity, and regulate protein interactions. This product consists of full-length human mature ubiquitin (amino acids 1-76), recombinantly expressed in E. coli. Typical working concentrations range from 250 to 750 uM.";

const PRODUCT_IMAGE_URL =
  "https://static.wixstatic.com/media/8c0a19_499c27210d414f1a82783cb89bc27aa7~mv2.png/v1/fill/w_525,h_577,al_c,lg_1,q_85,enc_avif,quality_auto/8c0a19_499c27210d414f1a82783cb89bc27aa7~mv2.png";

const PRODUCT_COA_URL =
  "https://8c0a19bf-a2d2-40b6-a0ea-bfe93aeb6d48.usrfiles.com/ugd/8c0a19_0b228567fcfe4f02bed02a58cda836d1.pdf";

const PRODUCT_STOCK = 100;

async function main() {
  const write = process.argv.includes("--write");

  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
    apiVersion: "2025-12-05",
  });

  const existing = await client.fetch<
    Array<{ _id: string; name: string; slug?: { current?: string } }>
  >(
    '*[_type == "product" && (slug.current == $slug || name == $name)]{_id, name, slug}',
    { slug: PRODUCT_SLUG, name: PRODUCT_NAME },
  );

  const category = await client.fetch<{ _id: string } | null>(
    '*[_type == "category" && slug.current == "ub-conjugation"][0]{_id}',
  );
  const subcategory = await client.fetch<{ _id: string } | null>(
    '*[_type == "subcategory" && slug.current == "ubiquitin-ubls"][0]{_id}',
  );

  if (!category?._id) {
    throw new Error('Missing category "ub-conjugation"');
  }
  if (!subcategory?._id) {
    throw new Error('Missing subcategory "ubiquitin-ubls"');
  }

  const payload = {
    _id: PRODUCT_DOC_ID,
    _type: "product" as const,
    name: PRODUCT_NAME,
    slug: { _type: "slug" as const, current: PRODUCT_SLUG },
    description: PRODUCT_DESCRIPTION,
    imageUrl: PRODUCT_IMAGE_URL,
    certificateOfAnalysisUrl: PRODUCT_COA_URL,
    quantity: "10 mg",
    molecularWeight: "8.5 kDa",
    price: 98,
    category: { _type: "reference" as const, _ref: category._id },
    subcategory: { _type: "reference" as const, _ref: subcategory._id },
    stock: PRODUCT_STOCK,
    featured: false,
    assemblyRequired: false,
  };

  console.log("Prepared product:");
  console.log(JSON.stringify(payload, null, 2));

  if (existing.length > 0) {
    console.log("\nProduct already exists.");
    for (const row of existing) {
      console.log(`- ${row._id} | ${row.name} | slug=${row.slug?.current ?? "none"}`);
    }

    if (!write) {
      console.log("\nDry run only. Re-run with --write to update existing product fields.");
      return;
    }

    for (const row of existing) {
      await client
        .patch(row._id)
        .set({
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          imageUrl: payload.imageUrl,
          certificateOfAnalysisUrl: payload.certificateOfAnalysisUrl,
          quantity: payload.quantity,
          molecularWeight: payload.molecularWeight,
          price: payload.price,
          stock: payload.stock,
          category: payload.category,
          subcategory: payload.subcategory,
        })
        .commit();
    }

    console.log(`\nUpdated ${existing.length} existing product doc(s).`);
    return;
  }

  if (!write) {
    console.log("\nDry run only. Re-run with --write to create the product.");
    return;
  }

  await client.create(payload);
  console.log(`\nCreated ${PRODUCT_DOC_ID}`);
}

main().catch((error) => {
  console.error("addUbiquitinHumanRecombinant failed:", error);
  process.exitCode = 1;
});
