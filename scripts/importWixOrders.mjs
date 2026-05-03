/**
 * Imports Wix historical orders into Sanity `order` documents.
 *
 * Usage:
 *   node scripts/importWixOrders.mjs --input=./data/wix-orders.json           # dry-run
 *   node scripts/importWixOrders.mjs --input=./data/wix-orders.json --apply   # write to Sanity
 *
 * Supported input formats:
 *   1) JSON: array of Wix-like order objects, or { orders: [...] }
 *   2) XLSX/CSV: tabular exports with flat columns (basic support)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import XLSX from "xlsx";
import { createClient } from "@sanity/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const SHOW_HELP = args.includes("--help") || args.includes("-h");
const APPLY = args.includes("--apply");
const inputArg = args.find((arg) => arg.startsWith("--input="));
const inputPath = inputArg
  ? path.resolve(process.cwd(), inputArg.replace("--input=", ""))
  : path.join(__dirname, "../data/wix-orders.json");

if (SHOW_HELP) {
  console.log(`
Wix order import

Usage:
  node scripts/importWixOrders.mjs --input=./data/wix-orders.json
  node scripts/importWixOrders.mjs --input=./data/wix-orders.json --apply

Flags:
  --input=PATH   Path to Wix orders file (JSON, XLSX, CSV)
  --apply        Persist changes to Sanity (default is dry-run)
  --help         Show this help
`);
  process.exit(0);
}

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
  throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is not set");
}
if (!process.env.NEXT_PUBLIC_SANITY_DATASET) {
  throw new Error("NEXT_PUBLIC_SANITY_DATASET is not set");
}
if (!process.env.SANITY_API_WRITE_TOKEN) {
  throw new Error("SANITY_API_WRITE_TOKEN is not set");
}

if (!fs.existsSync(inputPath)) {
  throw new Error(`Input file not found: ${inputPath}`);
}

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: "2026-05-02",
  useCdn: false,
});

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeName(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, " ");
}

function asNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,]/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asIsoDate(value) {
  if (!value) return null;
  if (typeof value === "number") {
    // Excel serial date support for CSV/XLSX rows.
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const millis = epoch.getTime() + value * 24 * 60 * 60 * 1000;
    const d = new Date(millis);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function getPath(obj, pathExpr) {
  return pathExpr.split(".").reduce((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return acc[key];
  }, obj);
}

function pick(obj, paths) {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function mapStatus(input) {
  const s = normalizeText(input).toLowerCase();
  if (!s) return "paid";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("deliver")) return "delivered";
  if (s.includes("ship") || s.includes("fulfill")) return "shipped";
  if (s.includes("paid") || s.includes("complete") || s.includes("success")) return "paid";
  return "paid";
}

function parseLineItems(raw) {
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.lineItems)
      ? raw.lineItems
      : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.orderItems)
          ? raw.orderItems
          : [];

  return source.map((item) => {
    const name = normalizeText(
      pick(item, [
        "name",
        "productName",
        "title",
        "lineItem.name",
        "catalogReference.name",
      ])
    );

    const quantity = asNumber(
      pick(item, ["quantity", "lineItem.quantity", "quantityOrdered"])
    ) ?? 1;

    const unitPrice =
      asNumber(
        pick(item, [
          "price",
          "unitPrice",
          "priceData.price",
          "lineItem.price",
          "lineItem.priceData.price",
        ])
      ) ?? 0;

    return {
      name,
      quantity,
      unitPrice,
      total: asNumber(pick(item, ["totalPrice", "lineItem.totalPrice"])),
    };
  });
}

function normalizeJsonOrder(order) {
  const email = normalizeEmail(
    pick(order, [
      "buyerInfo.email",
      "billingInfo.contactDetails.email",
      "shippingInfo.shippingDestination.contactDetails.email",
      "customer.email",
      "email",
    ])
  );

  const wixOrderId = normalizeText(pick(order, ["id", "_id", "orderId"]));
  const orderNumber = normalizeText(
    pick(order, ["number", "orderNumber", "orderNumberForDisplay", "name"])
  );

  const createdAt =
    asIsoDate(pick(order, ["createdDate", "createdAt", "dateCreated", "purchaseDate"])) ??
    new Date().toISOString();

  const statusRaw = pick(order, ["paymentStatus", "fulfillmentStatus", "status"]);

  const total =
    asNumber(
      pick(order, [
        "priceSummary.total.amount",
        "totals.total",
        "totals.totalPrice",
        "totals.total.amount",
        "total.amount",
        "total",
      ])
    ) ?? 0;

  const address = {
    name: normalizeText(
      pick(order, [
        "shippingInfo.shippingDestination.contactDetails.firstName",
        "shippingInfo.shippingDestination.contactDetails.fullName",
        "buyerInfo.firstName",
      ])
    ),
    line1: normalizeText(
      pick(order, [
        "shippingInfo.shippingDestination.address.addressLine1",
        "shippingAddress.line1",
        "address.line1",
      ])
    ),
    line2: normalizeText(
      pick(order, [
        "shippingInfo.shippingDestination.address.addressLine2",
        "shippingAddress.line2",
        "address.line2",
      ])
    ),
    city: normalizeText(
      pick(order, [
        "shippingInfo.shippingDestination.address.city",
        "shippingAddress.city",
        "address.city",
      ])
    ),
    postcode: normalizeText(
      pick(order, [
        "shippingInfo.shippingDestination.address.postalCode",
        "shippingAddress.postalCode",
        "address.postcode",
      ])
    ),
    country: normalizeText(
      pick(order, [
        "shippingInfo.shippingDestination.address.country",
        "shippingAddress.country",
        "address.country",
      ])
    ),
  };

  return {
    wixOrderId,
    orderNumber,
    email,
    createdAt,
    total,
    status: mapStatus(statusRaw),
    items: parseLineItems(order),
    address,
  };
}

function normalizeTabularOrder(row) {
  const email = normalizeEmail(
    pick(row, ["Buyer Email", "Email", "Customer Email", "email"])
  );

  const wixOrderId = normalizeText(
    pick(row, ["Order ID", "ID", "order_id", "orderId"])
  );

  const orderNumber = normalizeText(
    pick(row, ["Order #", "Order Number", "Number", "orderNumber"])
  );

  const createdAt =
    asIsoDate(pick(row, ["Date", "Created Date", "Created", "createdAt", "created_date"])) ??
    new Date().toISOString();

  const statusRaw = pick(row, ["Status", "Payment Status", "Fulfillment Status", "status"]);

  const total =
    asNumber(
      pick(row, ["Total", "Total Amount", "Amount", "total", "total_amount"])
    ) ?? 0;

  const address = {
    name: normalizeText(
      pick(row, ["Full Name", "Name", "Customer Name", "Shipping Name"])
    ),
    line1: normalizeText(
      pick(row, ["Address", "Shipping Address 1", "Address 1", "line1"])
    ),
    line2: normalizeText(
      pick(row, ["Address 2", "Shipping Address 2", "line2"])
    ),
    city: normalizeText(pick(row, ["City", "Shipping City", "city"])),
    postcode: normalizeText(pick(row, ["ZIP", "Postal Code", "postcode"])),
    country: normalizeText(pick(row, ["Country", "Shipping Country", "country"])),
  };

  return {
    wixOrderId,
    orderNumber,
    email,
    createdAt,
    total,
    status: mapStatus(statusRaw),
    items: [],
    address,
  };
}

function loadOrders(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".json") {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const source = Array.isArray(raw) ? raw : Array.isArray(raw?.orders) ? raw.orders : [];
    return source.map(normalizeJsonOrder);
  }

  if (ext === ".xlsx" || ext === ".csv") {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    return rows.map(normalizeTabularOrder);
  }

  throw new Error(`Unsupported input extension: ${ext}`);
}

console.log(`\nReading Wix orders from: ${inputPath}`);
const normalizedOrders = loadOrders(inputPath);
console.log(`Parsed ${normalizedOrders.length} order rows from source.`);

if (normalizedOrders.length === 0) {
  console.log("No orders found in input file.\n");
  process.exit(0);
}

const [products, customers] = await Promise.all([
  sanity.fetch(`*[_type == "product"]{_id, name, price}`),
  sanity.fetch(`*[_type == "customer" && defined(email)]{_id, email, clerkUserId}`),
]);

const productsByName = new Map();
for (const product of products) {
  const key = normalizeName(product.name);
  if (!key || productsByName.has(key)) continue;
  productsByName.set(key, product);
}

const customersByEmail = new Map();
for (const customer of customers) {
  const key = normalizeEmail(customer.email);
  if (!key) continue;
  customersByEmail.set(key, customer);
}

const customerUpserts = [];
const orderDocs = [];
const unmatchedProducts = new Map();
let skippedNoEmail = 0;

for (const row of normalizedOrders) {
  if (!row.email) {
    skippedNoEmail += 1;
    continue;
  }

  let customer = customersByEmail.get(row.email);
  if (!customer) {
    const newCustomer = {
      _id: `customer-wix-${toSlug(row.email)}`,
      _type: "customer",
      email: row.email,
      ...(row.address.name && { name: row.address.name }),
      ...(row.address.line1 && { streetAddress: row.address.line1 }),
      ...(row.address.city && { city: row.address.city }),
      ...(row.address.postcode && { zip: row.address.postcode }),
      ...(row.address.country && { country: row.address.country }),
      isLegacyCustomer: true,
      welcomeShown: false,
      createdAt: row.createdAt,
    };

    customerUpserts.push(newCustomer);
    customer = { _id: newCustomer._id, email: row.email, clerkUserId: null };
    customersByEmail.set(row.email, customer);
  }

  const resolvedItems = [];
  for (let i = 0; i < row.items.length; i += 1) {
    const item = row.items[i];
    if (!item.name) continue;
    const matched = productsByName.get(normalizeName(item.name));

    if (!matched) {
      const current = unmatchedProducts.get(item.name) ?? 0;
      unmatchedProducts.set(item.name, current + 1);
      continue;
    }

    resolvedItems.push({
      _key: `item-${i}`,
      product: { _type: "reference", _ref: matched._id },
      quantity: Math.max(1, item.quantity ?? 1),
      priceAtPurchase: item.unitPrice ?? matched.price ?? 0,
    });
  }

  const fallbackNumber = row.wixOrderId
    ? `WIX-${toSlug(row.wixOrderId).toUpperCase()}`
    : `WIX-${toSlug(`${row.email}-${row.createdAt}`).toUpperCase()}`;

  const orderDocIdSeed = row.wixOrderId || row.orderNumber || `${row.email}-${row.createdAt}`;

  orderDocs.push({
    _id: `order-wix-${toSlug(orderDocIdSeed)}`,
    _type: "order",
    orderNumber: row.orderNumber || fallbackNumber,
    customer: { _type: "reference", _ref: customer._id },
    ...(customer.clerkUserId && { clerkUserId: customer.clerkUserId }),
    email: row.email,
    items: resolvedItems,
    total: row.total,
    status: row.status,
    address: {
      ...(row.address.name && { name: row.address.name }),
      ...(row.address.line1 && { line1: row.address.line1 }),
      ...(row.address.line2 && { line2: row.address.line2 }),
      ...(row.address.city && { city: row.address.city }),
      ...(row.address.postcode && { postcode: row.address.postcode }),
      ...(row.address.country && { country: row.address.country }),
    },
    createdAt: row.createdAt,
  });
}

console.log(`\nPrepared ${orderDocs.length} order docs.`);
console.log(`Prepared ${customerUpserts.length} customer upserts (new legacy customers).`);
console.log(`Skipped ${skippedNoEmail} rows without email.`);

if (unmatchedProducts.size > 0) {
  const topUnmatched = [...unmatchedProducts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  console.log("\nTop unmatched product names (not imported into items):");
  for (const [name, count] of topUnmatched) {
    console.log(`  - ${name}: ${count}`);
  }
}

if (!APPLY) {
  console.log("\n[DRY RUN] No writes performed. Re-run with --apply to import.\n");
  process.exit(0);
}

const BATCH_SIZE = 50;

async function commitDocs(label, docs) {
  if (docs.length === 0) return;
  console.log(`\nWriting ${docs.length} ${label} docs...`);

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const tx = sanity.transaction();
    for (const doc of batch) {
      tx.createOrReplace(doc);
    }
    await tx.commit({ visibility: "async" });
    console.log(`  ✓ ${label} batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length}`);
  }
}

await commitDocs("customer", customerUpserts);
await commitDocs("order", orderDocs);

console.log("\nDone importing Wix order history.\n");
