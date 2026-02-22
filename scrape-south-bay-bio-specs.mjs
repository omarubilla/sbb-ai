import { createClient } from "@sanity/client";
import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import fs from "node:fs/promises";
import { JSDOM } from "jsdom";

dotenv.config({ path: ".env.local" });

const BASE_URL = "https://www.south-bay-bio.com";
const DEFAULT_SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const FIELD_KEYS = [
  "quantity",
  "molecularWeight",
  "purity",
  "storageBuffer",
  "storage",
];
const SPEC_MAX_LENGTH = {
  quantity: 120,
  molecularWeight: 120,
  purity: 180,
  storageBuffer: 400,
  storage: 700,
};

function parseArgs(argv) {
  const options = {
    target: "sanity",
    source: "products-json",
    productsFile: "products.json",
    sitemapUrl: DEFAULT_SITEMAP_URL,
    urlsFile: "",
    limit: 0,
    delayMs: 300,
    dryRun: false,
    mongoDb: process.env.MONGODB_DB || "test",
    mongoCollection: process.env.MONGODB_COLLECTION || "products",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.split("=");
    const nextArg = inlineValue ?? argv[index + 1];
    const hasSeparateValue = inlineValue === undefined && argv[index + 1] && !argv[index + 1].startsWith("--");

    switch (key) {
      case "--target":
        options.target = (nextArg || "sanity").toLowerCase();
        if (hasSeparateValue) index += 1;
        break;
      case "--source":
        options.source = (nextArg || "products-json").toLowerCase();
        if (hasSeparateValue) index += 1;
        break;
      case "--products-file":
        options.productsFile = nextArg || options.productsFile;
        if (hasSeparateValue) index += 1;
        break;
      case "--urls-file":
        options.urlsFile = nextArg || options.urlsFile;
        if (hasSeparateValue) index += 1;
        break;
      case "--sitemap-url":
        options.sitemapUrl = nextArg || options.sitemapUrl;
        if (hasSeparateValue) index += 1;
        break;
      case "--limit":
        options.limit = Number(nextArg || 0);
        if (hasSeparateValue) index += 1;
        break;
      case "--delay-ms":
        options.delayMs = Number(nextArg || 300);
        if (hasSeparateValue) index += 1;
        break;
      case "--mongo-db":
        options.mongoDb = nextArg || options.mongoDb;
        if (hasSeparateValue) index += 1;
        break;
      case "--mongo-collection":
        options.mongoCollection = nextArg || options.mongoCollection;
        if (hasSeparateValue) index += 1;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        break;
    }
  }

  return options;
}

function ensureValidOptions(options) {
  const validTargets = new Set(["sanity", "mongodb", "both"]);
  if (!validTargets.has(options.target)) {
    throw new Error(`Invalid --target '${options.target}'. Use sanity | mongodb | both`);
  }

  const validSources = new Set(["products-json", "sitemap", "urls-file"]);
  if (!validSources.has(options.source)) {
    throw new Error(`Invalid --source '${options.source}'. Use products-json | sitemap | urls-file`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; SouthBayBioSpecsBot/1.0)",
          accept: "text/html,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await sleep(400 * (attempt + 1));
    }
  }

  throw new Error(`Failed to fetch ${url}`);
}

function normalizeWhitespace(value) {
  return (value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function stripHtmlToText(html) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&gt;/gi, ">")
      .replace(/&lt;/gi, "<")
  );
}

function decodeHtmlEntities(value) {
  return (value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&gt;/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"');
}

function sanitizeHtmlForDom(html) {
  return html
    .replace(/\sstyle\s*=\s*"[^"]*"/gi, "")
    .replace(/\sstyle\s*=\s*'[^']*'/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

function normalizeKey(label) {
  const value = normalizeWhitespace(label)
    .toLowerCase()
    .replace(/[:\-]+$/g, "")
    .replace(/\s+/g, " ");

  if (value === "quantity") return "quantity";
  if (value === "molecular weight") return "molecularWeight";
  if (value === "purity") return "purity";
  if (value === "storage buffer") return "storageBuffer";
  if (value === "storage") return "storage";

  return null;
}

function addValue(result, key, value) {
  const clean = normalizeWhitespace(decodeHtmlEntities(value));
  if (!isLikelyValidSpecValue(key, clean)) {
    return;
  }
  if (!result[key]) {
    result[key] = clean;
  }
}

function isLikelyValidSpecValue(key, value) {
  if (!value && key !== "storageBuffer") {
    return false;
  }

  if (/var\(--|fontstyle|text-decoration|line-height|inherit/i.test(value)) {
    return false;
  }

  if (
    /window\.viewerModel|webpackJsonp|appsWarmupData|siteAssetsVersions|sourceMappingURL|thunderbolt/i.test(
      value
    )
  ) {
    return false;
  }

  const maxLength = SPEC_MAX_LENGTH[key] ?? 300;
  if (value.length > maxLength) {
    return false;
  }

  return true;
}

function extractFromSpecificationTable(html) {
  const result = {};
  const rowRegex = /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;

  for (const match of html.matchAll(rowRegex)) {
    const labelRaw = match[1]
      .replace(/<[^>]+>/g, " ")
      .trim();
    const valueRaw = match[2]
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .trim();

    const key = normalizeKey(labelRaw);
    if (!key) continue;

    addValue(result, key, valueRaw);
  }

  return result;
}

function extractFromStructuredElements(document) {
  const result = {};

  for (const row of document.querySelectorAll("tr")) {
    const cells = [...row.querySelectorAll("th,td")]
      .map((cell) => normalizeWhitespace(cell.textContent || ""))
      .filter(Boolean);

    if (cells.length < 2) continue;

    const key = normalizeKey(cells[0]);
    if (!key) continue;

    const value = cells.slice(1).join(" ");
    addValue(result, key, value);
  }

  const terms = [...document.querySelectorAll("dt")];
  for (const term of terms) {
    const key = normalizeKey(term.textContent || "");
    if (!key) continue;

    const definition = term.nextElementSibling;
    if (!definition) continue;

    addValue(result, key, definition.textContent || "");
  }

  return result;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBetweenLabels(text, currentLabel, nextLabels) {
  const nextPattern = nextLabels.map((label) => escapeRegExp(label)).join("|");
  const regex = new RegExp(
    `${escapeRegExp(currentLabel)}\\s*[:\\-]\\s*([\\s\\S]*?)(?=(?:${nextPattern})\\s*[:\\-]|$)`,
    "i"
  );
  const match = text.match(regex);
  return match?.[1] ? normalizeWhitespace(match[1]) : "";
}

function extractFromRawText(document) {
  const result = {};
  const rawText = normalizeWhitespace(document.body?.textContent || "");

  const labels = [
    { key: "quantity", label: "Quantity" },
    { key: "molecularWeight", label: "Molecular Weight" },
    { key: "purity", label: "Purity" },
    { key: "storageBuffer", label: "Storage Buffer" },
    { key: "storage", label: "Storage" },
  ];

  for (let index = 0; index < labels.length; index += 1) {
    const current = labels[index];
    const nextLabels = labels.slice(index + 1).map((item) => item.label);
    const value = extractBetweenLabels(rawText, current.label, nextLabels.length ? nextLabels : ["$a"]);

    if (!value && current.key !== "storageBuffer") {
      continue;
    }

    if (current.key === "storage" && value.toLowerCase().startsWith("buffer")) {
      continue;
    }

    result[current.key] = value;
  }

  return result;
}

function extractTitleFromHtml(html) {
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (ogTitleMatch?.[1]) {
    return normalizeWhitespace(ogTitleMatch[1]);
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return normalizeWhitespace(titleMatch?.[1] || "");
}

function extractFromRawHtmlText(html) {
  const result = {};
  const fromTable = extractFromSpecificationTable(html);
  for (const key of FIELD_KEYS) {
    if (fromTable[key]) {
      result[key] = fromTable[key];
    }
  }

  const rawText = stripHtmlToText(html);

  const labels = [
    { key: "quantity", label: "Quantity" },
    { key: "molecularWeight", label: "Molecular Weight" },
    { key: "purity", label: "Purity" },
    { key: "storageBuffer", label: "Storage Buffer" },
    { key: "storage", label: "Storage" },
  ];

  for (let index = 0; index < labels.length; index += 1) {
    const current = labels[index];
    const nextLabels = labels.slice(index + 1).map((item) => item.label);
    const value = extractBetweenLabels(rawText, current.label, nextLabels.length ? nextLabels : ["$a"]);

    if (!value && current.key !== "storageBuffer") {
      continue;
    }

    if (!result[current.key]) {
      result[current.key] = value;
    }
  }

  return result;
}

function extractFromWixSpecificationBlock(html) {
  const result = {};
  const specMatch = html.match(
    /"title":"Specification","description":("(?:\\.|[^"\\])*")/i
  );

  if (!specMatch?.[1]) {
    return result;
  }

  let specHtml = "";
  try {
    specHtml = JSON.parse(specMatch[1]);
  } catch {
    return result;
  }

  const tableSpecs = extractFromSpecificationTable(specHtml);
  const specText = stripHtmlToText(specHtml);

  for (const key of FIELD_KEYS) {
    if (tableSpecs[key]) {
      result[key] = tableSpecs[key];
    }
  }

  const labels = [
    { key: "quantity", label: "Quantity" },
    { key: "molecularWeight", label: "Molecular Weight" },
    { key: "purity", label: "Purity" },
    { key: "storageBuffer", label: "Storage Buffer" },
    { key: "storage", label: "Storage" },
  ];

  for (let index = 0; index < labels.length; index += 1) {
    const current = labels[index];
    const nextLabels = labels.slice(index + 1).map((item) => item.label);
    const value = extractBetweenLabels(
      specText,
      current.label,
      nextLabels.length ? nextLabels : ["$a"]
    );

    if (!result[current.key] && isLikelyValidSpecValue(current.key, value)) {
      result[current.key] = normalizeWhitespace(decodeHtmlEntities(value));
    }
  }

  return result;
}

function mergeSpecs(...sources) {
  const merged = {};
  for (const key of FIELD_KEYS) {
    let value = "";
    for (const source of sources) {
      if (source?.[key]) {
        value = source[key];
        break;
      }
    }

    const clean = normalizeWhitespace(decodeHtmlEntities(value));
    merged[key] = isLikelyValidSpecValue(key, clean) ? clean : "";
  }
  return merged;
}

function getUrlSlug(url) {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function normalizeName(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeSlug(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/-+$/g, "")
    .replace(/-\d+$/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getProductUrlsFromProductsJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  const rows = JSON.parse(raw);

  return rows
    .map((item) => item.url)
    .filter((url) => typeof url === "string" && url.includes("/product-page/"));
}

function extractLocUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gim)].map((match) => match[1].trim());
}

async function collectSitemapUrls(startUrl) {
  const queue = [startUrl];
  const visited = new Set();
  const productUrls = new Set();

  while (queue.length > 0) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;

    visited.add(url);

    let xml = "";
    try {
      xml = await fetchText(url, 1);
    } catch {
      continue;
    }

    const locs = extractLocUrls(xml);
    for (const loc of locs) {
      if (loc.includes("/product-page/")) {
        productUrls.add(loc);
        continue;
      }

      if (loc.endsWith(".xml") && !visited.has(loc)) {
        queue.push(loc);
      }
    }
  }

  return [...productUrls];
}

async function getUrlsFromFile(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line.includes("/product-page/"));
}

function buildSanityClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const token = process.env.SANITY_API_WRITE_TOKEN;

  if (!projectId || !dataset || !token) {
    throw new Error("Missing Sanity env vars (NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN)");
  }

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion: "2025-01-01",
    useCdn: false,
  });
}

async function getSanityProductIndex(client) {
  const rows = await client.fetch(`*[_type == "product"]{_id, name, "slug": slug.current}`);
  const bySlug = new Map();
  const byNormalizedSlug = new Map();
  const byName = new Map();

  for (const row of rows) {
    if (row.slug) {
      bySlug.set(String(row.slug).toLowerCase(), row);
      byNormalizedSlug.set(normalizeSlug(String(row.slug)), row);
    }

    if (row.name) {
      byName.set(normalizeName(String(row.name)), row);
    }
  }

  return { bySlug, byNormalizedSlug, byName, rows };
}

function pickSanityProduct(url, pageTitle, index) {
  const slug = getUrlSlug(url).toLowerCase();
  const fromSlug = index.bySlug.get(slug);
  if (fromSlug) return fromSlug;

  const normalizedSlug = normalizeSlug(slug);
  const fromNormalizedSlug = index.byNormalizedSlug.get(normalizedSlug);
  if (fromNormalizedSlug) return fromNormalizedSlug;

  const partialSlugMatch = index.rows.find((row) => {
    const candidate = normalizeSlug(String(row.slug || ""));
    return candidate && (candidate.includes(normalizedSlug) || normalizedSlug.includes(candidate));
  });
  if (partialSlugMatch) return partialSlugMatch;

  const fromTitle = index.byName.get(normalizeName(pageTitle));
  if (fromTitle) return fromTitle;

  return null;
}

async function main() {
  const options = parseArgs(process.argv);
  ensureValidOptions(options);

  console.log("🧪 South Bay Bio spec sync");
  console.log(`Target: ${options.target}`);
  console.log(`Source: ${options.source}`);
  console.log(`Dry run: ${options.dryRun ? "yes" : "no"}`);

  let urls = [];

  if (options.source === "products-json") {
    urls = await getProductUrlsFromProductsJson(options.productsFile);
  } else if (options.source === "sitemap") {
    urls = await collectSitemapUrls(options.sitemapUrl);
  } else {
    urls = await getUrlsFromFile(options.urlsFile);
  }

  urls = [...new Set(urls)].sort();

  if (options.limit > 0) {
    urls = urls.slice(0, options.limit);
  }

  if (urls.length === 0) {
    throw new Error("No product URLs found. Check your source options.");
  }

  console.log(`Found ${urls.length} product URLs`);

  let sanityClient = null;
  let sanityIndex = null;

  if (options.target === "sanity" || options.target === "both") {
    sanityClient = buildSanityClient();
    sanityIndex = await getSanityProductIndex(sanityClient);
    console.log(`Indexed ${sanityIndex.bySlug.size} Sanity products by slug`);
  }

  let mongoClient = null;
  let mongoCollection = null;

  if (options.target === "mongodb" || options.target === "both") {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is required for MongoDB target");
    }

    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    mongoCollection = mongoClient
      .db(options.mongoDb)
      .collection(options.mongoCollection);

    console.log(`Connected to MongoDB (${options.mongoDb}.${options.mongoCollection})`);
  }

  const stats = {
    scraped: 0,
    extracted: 0,
    sanityUpdated: 0,
    sanityUnmatched: 0,
    mongoUpdated: 0,
    failed: 0,
  };

  try {
    for (const [index, url] of urls.entries()) {
      try {
        const html = await fetchText(url, 2);
        const pageTitle = extractTitleFromHtml(html);
        const wixSpecs = extractFromWixSpecificationBlock(html);

        let structuredSpecs = {};
        let rawSpecs = {};

        try {
          const dom = new JSDOM(sanitizeHtmlForDom(html));
          const { document } = dom.window;
          structuredSpecs = extractFromStructuredElements(document);
          rawSpecs = extractFromRawText(document);
        } catch {
          rawSpecs = extractFromRawHtmlText(html);
        }

        const specs = mergeSpecs(wixSpecs, structuredSpecs, rawSpecs);

        stats.scraped += 1;

        const hasAnySpec = FIELD_KEYS.some((key) => specs[key]);
        if (hasAnySpec) {
          stats.extracted += 1;
        }

        if ((options.target === "sanity" || options.target === "both") && sanityClient && sanityIndex) {
          const targetProduct = pickSanityProduct(url, pageTitle, sanityIndex);

          if (!targetProduct) {
            stats.sanityUnmatched += 1;
          } else if (!options.dryRun) {
            await sanityClient.patch(targetProduct._id).set(specs).commit();
            stats.sanityUpdated += 1;
          } else {
            stats.sanityUpdated += 1;
          }
        }

        if ((options.target === "mongodb" || options.target === "both") && mongoCollection) {
          if (!options.dryRun) {
            await mongoCollection.updateOne(
              { url },
              {
                $set: {
                  ...specs,
                  url,
                  source: "south-bay-bio",
                  specsSyncedAt: new Date(),
                },
              },
              { upsert: true }
            );
          }

          stats.mongoUpdated += 1;
        }

        const summary = `${index + 1}/${urls.length} ${getUrlSlug(url)} => ${FIELD_KEYS
          .map((key) => `${key}: ${specs[key] || "—"}`)
          .join(" | ")}`;
        console.log(summary);

        await sleep(options.delayMs);
      } catch (error) {
        stats.failed += 1;
        console.error(`Failed ${url}: ${error.message}`);
      }
    }
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }

  console.log("\n✅ Sync complete");
  console.log(`Scraped pages: ${stats.scraped}`);
  console.log(`Pages with extracted specs: ${stats.extracted}`);
  console.log(`Sanity updates: ${stats.sanityUpdated}`);
  console.log(`Sanity unmatched: ${stats.sanityUnmatched}`);
  console.log(`Mongo updates: ${stats.mongoUpdated}`);
  console.log(`Failed pages: ${stats.failed}`);
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
