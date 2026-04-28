/**
 * Imports SBB_customer_contacts.xlsx into Sanity as customer documents.
 *
 * Usage:
 *   node scripts/importCustomerContacts.mjs           # dry-run (no writes)
 *   node scripts/importCustomerContacts.mjs --apply   # write to Sanity
 */

import { createClient } from "@sanity/client";
import XLSX from "xlsx";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const DRY_RUN = !process.argv.includes("--apply");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: "2025-12-05",
  useCdn: false,
});

// ── Parse XLSX ──────────────────────────────────────────────────────────────
// The file has a "Table 1" meta-header in row 0; actual column names are in row 1.
const wb = XLSX.readFile(path.join(__dirname, "../public/SBB_customer_contacts.xlsx"));
const ws = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// rawRows[0] = ["Table 1", "", "", ...]  — skip
// rawRows[1] = ["ID", "Name", "Email", ...]  — actual headers
// rawRows[2..] = data rows
const headers = rawRows[1];
const dataRows = rawRows.slice(2);

function col(row, name) {
  const idx = headers.indexOf(name);
  if (idx === -1) return "";
  const val = row[idx];
  return val === null || val === undefined ? "" : String(val).trim();
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toSlug(email) {
  // Use email as a stable, unique document ID suffix
  return email.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// ── Build documents ─────────────────────────────────────────────────────────
const docs = [];

for (const row of dataRows) {
  const email = col(row, "Email");
  if (!email) continue; // skip rows without email

  const wixId = col(row, "ID");
  const name = col(row, "Name");
  const phone = col(row, "Phone");
  const company = col(row, "Company");
  const streetAddress = col(row, "Street Address");
  const city = col(row, "City");
  const state = col(row, "State/Province");
  const zip = col(row, "ZIP");
  const country = col(row, "Country");
  const billingAddress = col(row, "Billing Address");
  const billingFirstName = col(row, "Billing Firstname");
  const billingLastName = col(row, "Billing Lastname");
  const customerSince = parseDate(col(row, "Customer Since"));

  const doc = {
    _type: "customer",
    _id: `customer-wix-${toSlug(email)}`,
    email,
    ...(name && { name }),
    ...(phone && { phone }),
    ...(company && { company }),
    ...(wixId && { wixCustomerId: wixId }),
    ...(streetAddress && { streetAddress }),
    ...(city && { city }),
    ...(state && { state }),
    ...(zip && { zip }),
    ...(country && { country }),
    ...(billingAddress && { billingAddress }),
    ...(billingFirstName && { billingFirstName }),
    ...(billingLastName && { billingLastName }),
    ...(customerSince && { customerSince }),
    createdAt: customerSince ?? new Date().toISOString(),
  };

  docs.push(doc);
}

console.log(`\nParsed ${docs.length} customers from XLSX.`);
console.log(`\nSample (first 3):`);
docs.slice(0, 3).forEach((d, i) =>
  console.log(`  [${i + 1}] ${d.email} | ${d.name ?? ""} | ${d.company ?? ""} | ${d.city ?? ""}`)
);

if (DRY_RUN) {
  console.log(`\n[DRY RUN] No writes. Re-run with --apply to import.\n`);
  process.exit(0);
}

// ── Write to Sanity via transaction ─────────────────────────────────────────
console.log(`\nWriting ${docs.length} documents to Sanity...`);

const BATCH = 50;
let created = 0;
let updated = 0;

for (let i = 0; i < docs.length; i += BATCH) {
  const batch = docs.slice(i, i + BATCH);
  const tx = client.transaction();
  for (const doc of batch) {
    // createOrReplace upserts by _id — safe to re-run
    tx.createOrReplace(doc);
  }
  const result = await tx.commit({ visibility: "async" });
  const txResults = result.results ?? [];
  for (const r of txResults) {
    if (r.operation === "create") created++;
    else updated++;
  }
  console.log(`  ✓ Batch ${Math.floor(i / BATCH) + 1}: committed ${batch.length} docs`);
}

console.log(`\nDone! ${created} created, ${updated} updated.\n`);
