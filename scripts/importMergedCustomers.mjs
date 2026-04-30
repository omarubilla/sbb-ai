/**
 * Imports public/merged_customers.csv into Sanity.
 * Marks every record as isLegacyCustomer: true, welcomeShown: false
 * so the app can show a personalised "reset your password" prompt on first login.
 *
 * Usage:
 *   node scripts/importMergedCustomers.mjs           # dry-run
 *   node scripts/importMergedCustomers.mjs --apply   # write to Sanity
 */

import { createClient } from "@sanity/client";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env.local") });

const APPLY = process.argv.includes("--apply");
const CSV_PATH = path.join(ROOT, "public", "merged_customers.csv");

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: "2025-12-05",
  useCdn: false,
});

// ── Parse merged CSV ──────────────────────────────────────────────────────────

const workbook = XLSX.readFile(CSV_PATH, { raw: false });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

function norm(value) {
  return String(value ?? "").trim();
}

function toSlug(email) {
  return email
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDate(value) {
  if (!norm(value)) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

const records = [];
let skippedNoEmail = 0;

for (const row of rows) {
  const email = norm(row.email).toLowerCase();
  const name = norm(row.name);

  // Skip rows with neither email nor name — nothing useful to store
  if (!email && !name) continue;

  // Sanity requires email; skip no-email rows from Sanity import
  // (they stay in the CSV but can't log in)
  if (!email) {
    skippedNoEmail += 1;
    continue;
  }

  records.push({
    _type: "customer",
    _id: `customer-wix-${toSlug(email)}`,
    email,
    ...(name && { name }),
    ...(norm(row.phone) && { phone: norm(row.phone) }),
    ...(norm(row.company) && { company: norm(row.company) }),
    ...(norm(row.wixCustomerId) && { wixCustomerId: norm(row.wixCustomerId) }),
    ...(norm(row.streetAddress) && { streetAddress: norm(row.streetAddress) }),
    ...(norm(row.city) && { city: norm(row.city) }),
    ...(norm(row.state) && { state: norm(row.state) }),
    ...(norm(row.zip) && { zip: norm(row.zip) }),
    ...(norm(row.country) && { country: norm(row.country) }),
    ...(norm(row.billingFirstName) && { billingFirstName: norm(row.billingFirstName) }),
    ...(norm(row.billingLastName) && { billingLastName: norm(row.billingLastName) }),
    ...(norm(row.billingAddress) && { billingAddress: norm(row.billingAddress) }),
    ...(parseDate(row.customerSince) && { customerSince: parseDate(row.customerSince) }),
    isLegacyCustomer: true,
    welcomeShown: false,
    createdAt: parseDate(row.createdAt) ?? new Date().toISOString(),
  });
}

console.log(`\nParsed ${records.length} importable records from merged_customers.csv.`);
console.log(`Skipped ${skippedNoEmail} records with no email (kept in CSV only).`);
console.log("\nSample (first 3):");
records.slice(0, 3).forEach((r, i) =>
  console.log(`  [${i + 1}] ${r.email} | ${r.name ?? ""} | ${r.company ?? ""}`)
);

if (!APPLY) {
  console.log("\n[DRY RUN] No writes. Re-run with --apply to import.\n");
  process.exit(0);
}

if (!process.env.SANITY_API_WRITE_TOKEN) {
  throw new Error("SANITY_API_WRITE_TOKEN is not set in .env.local");
}

// ── Upsert to Sanity ──────────────────────────────────────────────────────────

console.log(`\nUpserting ${records.length} documents to Sanity...`);

const BATCH_SIZE = 50;
let created = 0;
let updated = 0;

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const tx = sanityClient.transaction();

  for (const doc of batch) {
    tx.createOrReplace(doc);
  }

  const result = await tx.commit({ visibility: "async" });
  const txResults = result.results ?? [];

  for (const r of txResults) {
    if (r.operation === "create") created++;
    else updated++;
  }

  console.log(`  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} committed`);
}

console.log(`\nDone! ${created} created, ${updated} updated.\n`);
