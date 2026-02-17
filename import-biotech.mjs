import { getClient } from "@sanity/sdk";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = getClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

console.log(`DEBUG: projectId=${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}, dataset=${process.env.NEXT_PUBLIC_SANITY_DATASET}`);

// Define hierarchical categories: main -> subcategories
const categoryHierarchy = {
  "ub-conjugation": {
    title: "UB Conjugation",
    slug: "ub-conjugation",
    subcategories: [
      { id: "e1s-e2s", title: "E1s / E2s", slug: "e1s-e2s" },
      { id: "ubiquitin-ubls", title: "Ubiquitin/UBLs", slug: "ubiquitin-ubls" },
    ],
  },
  "e3-ligases": {
    title: "E3 Ligases",
    slug: "e3-ligases",
    subcategories: [
      { id: "e3-proteins", title: "E3 Ligase Proteins", slug: "e3-ligase-proteins" },
    ],
  },
  "ub-deconjugation": {
    title: "UB Deconjugation",
    slug: "ub-deconjugation",
    subcategories: [
      { id: "ubiquitinated-substrates", title: "Ubiquitinated Substrates", slug: "ubiquitinated-substrates" },
      { id: "dubs", title: "DUBs (Deubiquitinating Enzymes)", slug: "dubs" },
    ],
  },
  "c-terminal-derivatives": {
    title: "C-Terminal Derivatives",
    slug: "c-terminal-derivatives",
    subcategories: [
      { id: "ubl-derivatives", title: "UBL Derivatives", slug: "ubl-derivatives" },
      { id: "dub-inhibitors", title: "DUB Inhibitors", slug: "dub-inhibitors" },
    ],
  },
  proteasome: {
    title: "Proteasome",
    slug: "proteasome",
    subcategories: [
      { id: "26s-proteasome", title: "26S Proteasome", slug: "26s-proteasome" },
      { id: "20s-proteasome", title: "20S Proteasome", slug: "20s-proteasome" },
      { id: "20s-immunoproteasomes", title: "20S Immunoproteasomes", slug: "20s-immunoproteasomes" },
      { id: "proteasome-substrates", title: "Substrates", slug: "proteasome-substrates" },
      { id: "proteasome-kits", title: "Proteasome Kits", slug: "proteasome-kits" },
    ],
  },
  "tr-fret": {
    title: "TR-FRET",
    slug: "tr-fret",
    subcategories: [
      { id: "tr-fret-kits", title: "Kits", slug: "tr-fret-kits" },
      { id: "acceptors", title: "Acceptors", slug: "acceptors" },
      { id: "cryptate-donors", title: "Cryptate Donors", slug: "cryptate-donors" },
    ],
  },
  chains: {
    title: "Chains",
    slug: "chains",
    subcategories: [
      { id: "di-ubiquitin", title: "Di-Ubiquitin", slug: "di-ubiquitin" },
      { id: "tri-ubiquitin", title: "Tri-Ubiquitin", slug: "tri-ubiquitin" },
      { id: "tetra-ubiquitin", title: "Tetra-Ubiquitin", slug: "tetra-ubiquitin" },
      { id: "penta-ubiquitin", title: "Penta-Ubiquitin", slug: "penta-ubiquitin" },
    ],
  },
  neurodegenerative: {
    title: "Neurodegenerative Diseases",
    slug: "neurodegenerative-diseases",
    subcategories: [
      { id: "neuro-related", title: "Neurodegeneration Research", slug: "neurodegeneration-research" },
    ],
  },
};

// Category and subcategory keywords for matching
const categoryKeywords = {
  "ub-conjugation": {
    "e1s-e2s": ["e1", "e2", "ube2", "uba1", "activating enzyme"],
    "ubiquitin-ubls": ["ubiquitin", "nedd8", "sumo", "ubl"],
  },
  "e3-ligases": {
    "e3-proteins": ["e3", "ligase", "parkin", "ube3a", "mdm2", "itch", "nedd4", "xiap", "crbn", "ddb1"],
  },
  "ub-deconjugation": {
    "ubiquitinated-substrates": ["ubiquitinated", "poly-ubiquitin", "substrate"],
    "dubs": ["dub", "deubiquitin", "uchl", "usp", "senp", "nedp"],
  },
  "c-terminal-derivatives": {
    "ubl-derivatives": ["derivative", "c-terminal", "cterminal", "sumo", "nedd8"],
    "dub-inhibitors": ["inhibitor", "aldehyde", "vinyl", "propargylamide", "vinyl methyl ester", "vinyl sulfone"],
  },
  proteasome: {
    "26s-proteasome": ["26s", "pa28"],
    "20s-proteasome": ["20s", "proteasome", "chymotrypsin", "caspase"],
    "20s-immunoproteasomes": ["immunoproteasome", "immunoproteasome"],
    "proteasome-substrates": ["substrate", "suc-llvy", "lle-amc"],
    "proteasome-kits": ["kit", "proteasome kit"],
  },
  "tr-fret": {
    "tr-fret-kits": ["kit", "tr-fret", "fret kit"],
    acceptors: ["acceptor", "cy5", "fluorescein"],
    "cryptate-donors": ["europium", "cryptate", "donor", "terbium"],
  },
  chains: {
    "di-ubiquitin": ["di-ubiquitin", "2x", "k48", "k63", "m1", "k6", "k11", "k29", "k33"],
    "tri-ubiquitin": ["tri-ubiquitin", "3x"],
    "tetra-ubiquitin": ["tetra-ubiquitin", "4x"],
    "penta-ubiquitin": ["penta-ubiquitin", "5x"],
  },
  neurodegenerative: {
    "neuro-related": ["neurodegeneration", "parkinson", "alzheimer", "tau", "disease"],
  },
};

// Read products
const biotech = JSON.parse(fs.readFileSync("products.json", "utf-8"));

console.log(`🧬 Auto-categorizing ${biotech.length} biotech products with hierarchy...\n`);

// Transform MongoDB format to Sanity format with hierarchical categorization
const sanityDocs = biotech.map((product, index) => {
  const text = `${product.title || ""} ${product.description || ""}`.toLowerCase();

  let mainCategoryId = "ub-conjugation"; // default
  let subcategoryId = "e1s-e2s"; // default
  let matchedMain = "Unknown";
  let matchedSub = "Unknown";

  // Find best matching main category and subcategory
  for (const [mainCatId, mainCatData] of Object.entries(categoryKeywords)) {
    for (const [subCatId, keywords] of Object.entries(mainCatData)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        mainCategoryId = mainCatId;
        subcategoryId = subCatId;
        matchedMain = categoryHierarchy[mainCatId].title;
        matchedSub = categoryHierarchy[mainCatId].subcategories.find((s) => s.id === subCatId)?.title || "Unknown";
        break;
      }
    }
    if (mainCategoryId !== "ub-conjugation") break;
  }

  const slug = (product.title || `product-${index}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    _type: "product",
    name: product.title || "Untitled Product",
    slug: { _type: "slug", current: slug },
    description: product.description || "",
    price: product.currentPrice || product.averagePrice || 0,
    category: { _type: "reference", _ref: `category-${mainCategoryId}` },
    subcategory: { _type: "reference", _ref: `subcategory-${subcategoryId}` },
    material: "Biotech",
    color: "natural",
    dimensions: "Standard",
    stock: product.isOutOfStock ? 0 : 100,
    _matchMain: matchedMain,
    _matchSub: matchedSub,
  };
});

// Count by category
const countByCategory = {};
sanityDocs.forEach((p) => {
  const key = `${p._matchMain} > ${p._matchSub}`;
  countByCategory[key] = (countByCategory[key] || 0) + 1;
});

console.log("📊 Distribution by category hierarchy:");
Object.entries(countByCategory).forEach(([cat, count]) => {
  console.log(`   ${cat}: ${count} products`);
});

console.log("\n✨ Creating category structure...");

// Create category and subcategory documents
async function createCategories() {
  const categoryDocs = [];
  const subcategoryDocs = [];

  // Create main category documents
  for (const [catId, catData] of Object.entries(categoryHierarchy)) {
    categoryDocs.push({
      _id: `category-${catId}`,
      _type: "category",
      name: catData.title,
      slug: { _type: "slug", current: catData.slug },
      description: `${catData.title} products from South Bay Bio catalog`,
    });

    // Create subcategory documents
    for (const subcat of catData.subcategories) {
      subcategoryDocs.push({
        _id: `subcategory-${subcat.id}`,
        _type: "subcategory",
        name: subcat.title,
        slug: { _type: "slug", current: subcat.slug },
        parentCategory: {
          _type: "reference",
          _ref: `category-${catId}`,
        },
        description: `${subcat.title} - ${catData.title}`,
      });
    }
  }

  console.log(`   Creating ${categoryDocs.length} main categories...`);
  console.log(`   Creating ${subcategoryDocs.length} subcategories...`);

  // Batch create categories
  const batchSize = 10;
  const allCategoryDocs = [...categoryDocs, ...subcategoryDocs];

  for (let i = 0; i < allCategoryDocs.length; i += batchSize) {
    const batch = allCategoryDocs.slice(i, i + batchSize);
    try {
      await Promise.all(batch.map((doc) => client.createOrReplace(doc)));
      console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1} created (${batch.length} categories/subcategories)`);
    } catch (error) {
      console.error(`   ✗ Error creating batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    }
  }
}

// Import products in batches
async function importProducts() {
  console.log(`\n📦 Importing ${sanityDocs.length} products in batches...\n`);

  // Remove internal fields before importing
  const productsToImport = sanityDocs.map((p) => {
    const { _matchMain, _matchSub, ...rest } = p;
    return rest;
  });

  const batchSize = 10;
  for (let i = 0; i < productsToImport.length; i += batchSize) {
    const batch = productsToImport.slice(i, i + batchSize);
    try {
      await Promise.all(batch.map((doc) => client.create(doc)));
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(productsToImport.length / batchSize);
      console.log(`   ✓ Batch ${batchNum}/${totalBatches} imported (${batch.length} products)`);
    } catch (error) {
      console.error(`   ✗ Error importing batch:`, error.message);
    }
  }
}

// Run import
async function main() {
  try {
    await createCategories();
    await importProducts();
    console.log("\n✅ Import complete!");
    console.log(`\n📊 Summary:`);
    console.log(`   - ${categoryHierarchy[Object.keys(categoryHierarchy)[0]]} Main categories created`);
    let totalSubcats = 0;
    Object.values(categoryHierarchy).forEach((cat) => {
      totalSubcats += cat.subcategories.length;
    });
    console.log(`   - ${totalSubcats} Subcategories created`);
    console.log(`   - ${sanityDocs.length} Products imported`);
  } catch (error) {
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  }
}

main();
