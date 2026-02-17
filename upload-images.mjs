import { createClient } from "@sanity/client";
import fetch from "node-fetch";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
  apiVersion: "2023-05-03",
});

const products = JSON.parse(fs.readFileSync("products.json", "utf-8"));

async function uploadImage(imageUrl) {
  try {
    // Fix Wix CDN URLs - remove low resolution and blur parameters
    let highResUrl = imageUrl;
    if (imageUrl.includes('wixstatic.com')) {
      // Remove the /v1/fill/... parameters to get the original high-res image
      highResUrl = imageUrl.split('/v1/')[0];
      console.log(`  📸 Using high-res URL: ${highResUrl.substring(0, 80)}...`);
    }
    
    const response = await fetch(highResUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.buffer();
    const asset = await client.assets.upload("image", buffer, {
      filename: highResUrl.split("/").pop().split("?")[0] || "product.jpg",
    });
    return asset._id;
  } catch (error) {
    console.error(`Failed to upload image ${imageUrl}:`, error.message);
    return null;
  }
}

async function main() {
  console.log(`🖼️  Uploading images for ${products.length} products...\n`);

  let uploaded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const slug = (product.title || `product-${i}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    console.log(`[${i + 1}/${products.length}] Processing: ${product.title}`);

    if (!product.image) {
      console.log(`  ⊘ No image URL\n`);
      skipped++;
      continue;
    }

    // Upload image to Sanity
    const assetId = await uploadImage(product.image);
    if (!assetId) {
      failed++;
      continue;
    }

    // Find the product document by slug and update it
    try {
      const existingProducts = await client.fetch(
        `*[_type == "product" && slug.current == $slug][0]`,
        { slug }
      );

      if (!existingProducts) {
        console.log(`  ⚠️  Product not found in Sanity\n`);
        failed++;
        continue;
      }

      await client
        .patch(existingProducts._id)
        .set({
          images: [
            {
              _type: "image",
              asset: {
                _type: "reference",
                _ref: assetId,
              },
            },
          ],
        })
        .commit();

      console.log(`  ✓ Image uploaded and linked\n`);
      uploaded++;
    } catch (error) {
      console.error(`  ✗ Failed to update product:`, error.message, "\n");
      failed++;
    }
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${skipped}`);
}

main().catch(console.error);
