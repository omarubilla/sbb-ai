import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

type ProductRecord = {
  productName: string;
  sku: string;
  lot: string;
  coaUrl: string;
};

type ProductRecordWithId = ProductRecord & {
  productId: string;
  pageUrl: string;
};

type ScrapedProduct = {
  productName: string;
  sku: string;
  lot: string;
  productId: string;
  pageUrl: string;
  validatedCoaUrls: string[];
  allCandidateCoaUrls: string[];
  error?: string;
};

const BASE_URL = "https://www.south-bay-bio.com";
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const MAX_CONCURRENCY = 4;
const MAX_RETRIES = 3;
const CRAWL_DELAY_MS = 500;

const OUTPUT_JSON_PATH = path.resolve("data/coa-links.json");
const OUTPUT_CSV_PATH = path.resolve("data/coa-links.csv");
const OUTPUT_JSON_WITH_IDS_PATH = path.resolve("data/coa-links-with-ids.json");
const OUTPUT_CSV_WITH_IDS_PATH = path.resolve("data/coa-links-with-ids.csv");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    if (parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function normalizeProductName(name: string): string {
  const n = normalizeWhitespace(name);
  if (/^Mdm2\b/i.test(n)) {
    return n.replace(/^Mdm2/, "MDM2");
  }
  return n;
}

function sanitizeExtractedToken(value: string, type: "sku" | "lot"): string {
  const token = normalizeWhitespace(value).replace(/[.,;:]+$/g, "");
  if (!token) return "";

  // Filters noisy strings commonly leaked from Wix runtime payloads.
  if (/^(ion-sensitive|saddmoreprops|analysis|color-rgb)$/i.test(token)) {
    return "";
  }

  if (type === "sku") {
    if (/^sbb[\-–]/i.test(token)) return token;
    if (!/[0-9]/.test(token)) return "";
  }

  if (type === "lot") {
    if (!/[0-9]/.test(token)) return "";
  }

  return token;
}

function parseXmlLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean);
}

function toCsvCell(value: string): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

async function fetchTextWithRetry(url: string, retries = 2): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; SouthBayBio-CoA-Scraper/1.0)",
          accept: "text/html,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

async function discoverProductUrlsFromSitemaps(rootSitemapUrl: string): Promise<string[]> {
  const sitemapQueue = [rootSitemapUrl];
  const visitedSitemaps = new Set<string>();
  const productUrls = new Set<string>();

  while (sitemapQueue.length > 0) {
    const sitemapUrl = sitemapQueue.shift();
    if (!sitemapUrl) continue;

    const normalized = normalizeUrl(sitemapUrl);
    if (visitedSitemaps.has(normalized)) continue;
    visitedSitemaps.add(normalized);

    let xml: string;
    try {
      xml = await fetchTextWithRetry(normalized, 2);
    } catch {
      continue;
    }

    const locs = parseXmlLocs(xml);

    for (const loc of locs) {
      if (!/^https?:\/\//i.test(loc)) continue;
      const u = normalizeUrl(loc);

      if (/sitemap/i.test(u) && /\.xml($|\?)/i.test(u)) {
        if (!visitedSitemaps.has(u)) {
          sitemapQueue.push(u);
        }
        continue;
      }

      if (/\/product-page\//i.test(u)) {
        productUrls.add(u);
      }
    }
  }

  return [...productUrls];
}

async function fallbackDiscoverProductUrlsViaBrowser(context: BrowserContext): Promise<string[]> {
  const page = await context.newPage();
  const found = new Set<string>();

  try {
    await page.goto(`${BASE_URL}/products`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(3000);

    for (let pass = 0; pass < 8; pass += 1) {
      const hrefs = await page.$$eval("a[href]", (anchors) =>
        anchors
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((href) => /\/product-page\//i.test(href))
      );
      for (const href of hrefs) {
        found.add(href);
      }

      await page.evaluate(() => {
        window.scrollBy(0, Math.max(window.innerHeight * 0.8, 600));
      });
      await page.waitForTimeout(1200);
    }
  } finally {
    await page.close();
  }

  return [...found].map(normalizeUrl);
}

async function revealPotentialHiddenSections(page: Page): Promise<void> {
  await page.evaluate(() => {
    const matchText = (value: string): boolean =>
      /(certificate|analysis|coa|coa\b|details|more info|documentation|documents|files|tab)/i.test(value);

    const clickIfVisible = (el: Element): void => {
      const htmlEl = el as HTMLElement;
      const style = window.getComputedStyle(htmlEl);
      if (style.display === "none" || style.visibility === "hidden") return;
      if (htmlEl.offsetParent === null && style.position !== "fixed") return;
      htmlEl.click();
    };

    const tabs = Array.from(document.querySelectorAll('[role="tab"], [data-hook*="tab"]'));
    for (const tab of tabs) {
      clickIfVisible(tab);
    }

    const expandable = Array.from(document.querySelectorAll("button, summary, [aria-expanded='false']"));
    for (const el of expandable) {
      const text = (el.textContent || "").trim();
      if (text && matchText(text)) {
        clickIfVisible(el);
      }
    }
  });

  await page.waitForTimeout(800);
}

function extractSkuAndLot(textBlob: string): { sku: string; lot: string } {
  const clean = normalizeWhitespace(textBlob);

  const skuPatterns = [
    /(?:Catalog|Cat\.?|SKU)\s*#?\s*:?\s*([A-Z]{2,6}[\-–][A-Z0-9\-]+)/i,
    /\b(SBB[\-–][A-Z0-9\-]{3,})\b/i,
  ];

  const lotPatterns = [
    /Lot\s*(?:No\.?|Number|#)?\s*:?\s*([A-Z0-9\-]+)/i,
    /\bLOT\s*#?\s*([A-Z0-9\-]+)/i,
  ];

  let sku = "";
  for (const pattern of skuPatterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      const candidate = sanitizeExtractedToken(match[1], "sku");
      if (candidate) {
        sku = candidate;
        break;
      }
    }
  }

  let lot = "";
  for (const pattern of lotPatterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      const candidate = sanitizeExtractedToken(match[1], "lot");
      if (candidate) {
        lot = candidate;
        break;
      }
    }
  }

  return { sku, lot };
}

function extractProductId(html: string, pageUrl: string): string {
  const idPatterns = [
    /"productId"\s*:\s*"([^"]+)"/i,
    /"id"\s*:\s*"([0-9a-f]{24,36})"/i,
    /"product"\s*:\s*\{[^}]*"id"\s*:\s*"([^"]+)"/i,
  ];

  for (const pattern of idPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return normalizeWhitespace(match[1]);
    }
  }

  const slug = pageUrl.split("/").filter(Boolean).pop() ?? "";
  return slug || pageUrl;
}

function getCandidateCoaLinksFromHtml(html: string): string[] {
  const urls = [...html.matchAll(/https?:\/\/[^\s"'<>]+/gi)]
    .map((m) => m[0])
    .filter((url) => /\.pdf(?:$|[?#])/i.test(url) || /usrfiles\.com/i.test(url));

  return urls.map(normalizeUrl);
}

function isLikelyCoaLink(url: string, text: string): boolean {
  const cleanText = normalizeWhitespace(text);
  if (/certificate of analysis|\bcoa\b/i.test(cleanText)) return true;
  if (/usrfiles\.com/i.test(url)) return true;
  if (/\.pdf(?:$|[?#])/i.test(url)) return true;
  return false;
}

async function validatePdfUrl(url: string): Promise<boolean> {
  const check = async (method: "HEAD" | "GET"): Promise<boolean> => {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; SouthBayBio-CoA-Scraper/1.0)",
        accept: "application/pdf,*/*;q=0.8",
        ...(method === "GET" ? { Range: "bytes=0-1024" } : {}),
      },
    });

    if (response.status !== 200 && response.status !== 206) {
      return false;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    return contentType.includes("application/pdf") || /\.pdf(?:$|[?#])/i.test(url);
  };

  try {
    if (await check("HEAD")) return true;
  } catch {
    // Fallback to GET.
  }

  try {
    return await check("GET");
  } catch {
    return false;
  }
}

async function scrapeProductPage(context: BrowserContext, pageUrl: string): Promise<ScrapedProduct> {
  let page: Page | null = null;

  try {
    page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(2500);
    await revealPotentialHiddenSections(page);

    const pageTitle = await page.title();
    const h1 = normalizeWhitespace(await page.textContent("h1").catch(() => ""));
    const productName = normalizeProductName(h1 || pageTitle.replace(/\s*\|.*$/, "") || pageUrl);

    const bodyText = normalizeWhitespace(await page.textContent("body").catch(() => ""));
    const { sku, lot } = extractSkuAndLot(bodyText);

    const anchors = await page.$$eval("a[href]", (nodes) =>
      nodes.map((node) => {
        const a = node as HTMLAnchorElement;
        return {
          href: a.href,
          text: (a.textContent || "").trim(),
        };
      })
    );

    const html = await page.content();
    const htmlCandidates = getCandidateCoaLinksFromHtml(html);

    const candidateSet = new Set<string>();
    for (const anchor of anchors) {
      if (!anchor.href) continue;
      const normalizedHref = normalizeUrl(anchor.href);
      if (isLikelyCoaLink(normalizedHref, anchor.text)) {
        candidateSet.add(normalizedHref);
      }
    }

    for (const candidate of htmlCandidates) {
      candidateSet.add(candidate);
    }

    const candidates = [...candidateSet].filter((url) => /^https?:\/\//i.test(url));

    const validated: string[] = [];
    for (const candidate of candidates) {
      const ok = await validatePdfUrl(candidate);
      if (ok) {
        validated.push(candidate);
      }
    }

    const dedupValidated = [...new Set(validated)].sort();
    const productId = extractProductId(html, pageUrl);

    return {
      productName,
      sku,
      lot,
      productId,
      pageUrl,
      validatedCoaUrls: dedupValidated,
      allCandidateCoaUrls: candidates,
    };
  } catch (error) {
    return {
      productName: pageUrl,
      sku: "",
      lot: "",
      productId: pageUrl,
      pageUrl,
      validatedCoaUrls: [],
      allCandidateCoaUrls: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

async function scrapeProductWithRetry(context: BrowserContext, pageUrl: string): Promise<ScrapedProduct> {
  let last: ScrapedProduct | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const result = await scrapeProductPage(context, pageUrl);
    last = result;

    if (!result.error) {
      return result;
    }

    await sleep(500 * attempt);
  }

  return (
    last ?? {
      productName: pageUrl,
      sku: "",
      lot: "",
      productId: pageUrl,
      pageUrl,
      validatedCoaUrls: [],
      allCandidateCoaUrls: [],
      error: "Unknown error",
    }
  );
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) break;

      results[index] = await worker(items[index], index);
      await sleep(CRAWL_DELAY_MS);
    }
  });

  await Promise.all(runners);
  return results;
}

async function writeOutputs(rowsWithIds: ProductRecordWithId[]): Promise<void> {
  await fs.mkdir(path.dirname(OUTPUT_JSON_PATH), { recursive: true });

  const rows: ProductRecord[] = rowsWithIds.map(({ productName, sku, lot, coaUrl }) => ({
    productName,
    sku,
    lot,
    coaUrl,
  }));

  await fs.writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  await fs.writeFile(OUTPUT_JSON_WITH_IDS_PATH, `${JSON.stringify(rowsWithIds, null, 2)}\n`, "utf8");

  const csvHeader = ["productName", "sku", "lot", "coaUrl"];
  const csvLines = [csvHeader.join(",")];
  for (const row of rows) {
    csvLines.push([
      toCsvCell(row.productName),
      toCsvCell(row.sku),
      toCsvCell(row.lot),
      toCsvCell(row.coaUrl),
    ].join(","));
  }
  await fs.writeFile(OUTPUT_CSV_PATH, `${csvLines.join("\n")}\n`, "utf8");

  const csvWithIdsHeader = ["productName", "sku", "lot", "coaUrl", "productId", "pageUrl"];
  const csvWithIdsLines = [csvWithIdsHeader.join(",")];
  for (const row of rowsWithIds) {
    csvWithIdsLines.push([
      toCsvCell(row.productName),
      toCsvCell(row.sku),
      toCsvCell(row.lot),
      toCsvCell(row.coaUrl),
      toCsvCell(row.productId),
      toCsvCell(row.pageUrl),
    ].join(","));
  }
  await fs.writeFile(OUTPUT_CSV_WITH_IDS_PATH, `${csvWithIdsLines.join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (compatible; SouthBayBio-CoA-Scraper/1.0)",
  });

  try {
    const sitemapUrls = await discoverProductUrlsFromSitemaps(SITEMAP_URL);
    const browserFallbackUrls = await fallbackDiscoverProductUrlsViaBrowser(context);

    const productUrls = [...new Set([...sitemapUrls, ...browserFallbackUrls])].sort();

    console.log(`Discovered product URLs: ${productUrls.length}`);

    const scraped = await runWithConcurrency(productUrls, MAX_CONCURRENCY, async (url, index) => {
      console.log(`Scraping [${index + 1}/${productUrls.length}] ${url}`);
      return await scrapeProductWithRetry(context, url);
    });

    const allRowsWithIds: ProductRecordWithId[] = [];
    let productsWithCoa = 0;
    let productsMissingCoa = 0;
    let failedPages = 0;

    for (const product of scraped) {
      if (product.error) {
        failedPages += 1;
      }

      if (product.validatedCoaUrls.length === 0) {
        productsMissingCoa += 1;
        continue;
      }

      productsWithCoa += 1;
      for (const coaUrl of product.validatedCoaUrls) {
        allRowsWithIds.push({
          productName: product.productName,
          sku: product.sku,
          lot: product.lot,
          coaUrl,
          productId: product.productId,
          pageUrl: product.pageUrl,
        });
      }
    }

    const dedupedRows = new Map<string, ProductRecordWithId>();
    for (const row of allRowsWithIds) {
      const key = `${row.productId}|${row.coaUrl}`;
      if (!dedupedRows.has(key)) {
        dedupedRows.set(key, row);
      }
    }

    const finalRows = [...dedupedRows.values()].sort((a, b) => {
      const left = `${a.productName}|${a.coaUrl}`.toLowerCase();
      const right = `${b.productName}|${b.coaUrl}`.toLowerCase();
      return left.localeCompare(right);
    });

    await writeOutputs(finalRows);

    console.log("\n=== CoA Scrape Summary ===");
    console.log(`Total product pages processed: ${scraped.length}`);
    console.log(`Products with at least one CoA: ${productsWithCoa}`);
    console.log(`Products missing CoA: ${productsMissingCoa}`);
    console.log(`Failed pages after retries: ${failedPages}`);
    console.log(`Validated CoA links exported: ${finalRows.length}`);
    console.log(`JSON: ${OUTPUT_JSON_PATH}`);
    console.log(`CSV: ${OUTPUT_CSV_PATH}`);
    console.log(`JSON with IDs: ${OUTPUT_JSON_WITH_IDS_PATH}`);
    console.log(`CSV with IDs: ${OUTPUT_CSV_WITH_IDS_PATH}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error("CoA scraper failed:", error);
  process.exitCode = 1;
});
