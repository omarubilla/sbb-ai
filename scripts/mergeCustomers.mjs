/**
 * Merges SBB_customer_contacts.xlsx + contacts_emailSubscribers.csv into
 * public/merged_customers.csv.
 *
 * Rules:
 *  - Match by email (case-insensitive). If both sources have the same email,
 *    the row is merged — non-empty values from the XLSX win; CSV fills gaps.
 *  - Rows with a blank name are kept (name = "").
 *  - Rows with a blank email but a name are kept (email = "").
 *  - Duplicate emails within the same source keep the first occurrence.
 *
 * Usage:
 *   node scripts/mergeCustomers.mjs
 */

import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const XLSX_PATH = path.join(ROOT, "public", "SBB_customer_contacts.xlsx");
const CSV_PATH = path.join(ROOT, "public", "contacts_emailSubscribers.csv");
const OUT_PATH = path.join(ROOT, "public", "merged_customers.csv");

// ── Helpers ──────────────────────────────────────────────────────────────────

function norm(value) {
  return String(value ?? "").trim();
}

function normEmail(value) {
  return norm(value).toLowerCase();
}

/** Prefer a over b — return a if a is non-empty, else b. */
function prefer(a, b) {
  return norm(a) !== "" ? norm(a) : norm(b);
}

function csvEscape(value) {
  const str = norm(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Parse XLSX ────────────────────────────────────────────────────────────────

const workbook = XLSX.readFile(XLSX_PATH);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const xlsxRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

// Row 0 = "Table 1" meta-header; Row 1 = real headers; Row 2+ = data
const xlsxHeaders = xlsxRaw[1];
const xlsxData = xlsxRaw.slice(2);

function xlsxCol(row, name) {
  const idx = xlsxHeaders.indexOf(name);
  return idx >= 0 ? norm(row[idx]) : "";
}

/** Normalise an XLSX row into our shared schema. */
function fromXlsx(row) {
  const rawEmail = xlsxCol(row, "Email");
  const email = normEmail(rawEmail);
  const name = xlsxCol(row, "Name");

  // Split "Name" into first/last heuristically
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

  return {
    email,
    name,
    firstName: prefer(xlsxCol(row, "Billing Firstname"), firstName),
    lastName: prefer(xlsxCol(row, "Billing Lastname"), lastName),
    phone: xlsxCol(row, "Phone"),
    company: xlsxCol(row, "Company"),
    streetAddress: xlsxCol(row, "Street Address"),
    city: xlsxCol(row, "City"),
    state: xlsxCol(row, "State/Province"),
    zip: xlsxCol(row, "ZIP"),
    country: xlsxCol(row, "Country"),
    billingFirstName: xlsxCol(row, "Billing Firstname"),
    billingLastName: xlsxCol(row, "Billing Lastname"),
    billingAddress: xlsxCol(row, "Billing Address"),
    customerSince: xlsxCol(row, "Customer Since"),
    wixCustomerId: xlsxCol(row, "ID"),
    emailSubscriberStatus: "",
    createdAt: xlsxCol(row, "Customer Since"),
    source: "xlsx",
  };
}

// ── Parse CSV ─────────────────────────────────────────────────────────────────

const csvWorkbook = XLSX.readFile(CSV_PATH, { raw: false });
const csvWorksheet = csvWorkbook.Sheets[csvWorkbook.SheetNames[0]];
const csvRaw = XLSX.utils.sheet_to_json(csvWorksheet, { header: 1, defval: "" });

const csvHeaders = csvRaw[0];
const csvData = csvRaw.slice(1);

function csvCol(row, ...names) {
  for (const name of names) {
    const idx = csvHeaders.indexOf(name);
    if (idx >= 0) {
      const val = norm(row[idx]);
      if (val !== "") return val;
    }
  }
  return "";
}

/** Normalise a CSV row into our shared schema. */
function fromCsv(row) {
  const rawEmail = csvCol(row, "Email 1");
  const email = normEmail(rawEmail);
  const csvFullName = csvCol(row, "Full Name");
  const firstName = csvCol(row, "First Name");
  const lastName = csvCol(row, "Last Name");
  const name = prefer(csvFullName, [firstName, lastName].filter(Boolean).join(" "));

  const streetAddress = prefer(
    csvCol(row, "Address 1 - Street"),
    csvCol(row, "Adress") // typo in source
  );

  return {
    email,
    name,
    firstName: prefer(csvCol(row, "Billing First Name", "Billing Firstname"), firstName),
    lastName: prefer(csvCol(row, "Billing Last Name", "Billing Lastname"), lastName),
    phone: csvCol(row, "Phone 1", "Phone 2"),
    company: csvCol(row, "Company"),
    streetAddress,
    city: csvCol(row, "Address 1 - City"),
    state: csvCol(row, "Address 1 - State/Region"),
    zip: csvCol(row, "Address 1 - Zip"),
    country: csvCol(row, "Address 1 - Country"),
    billingFirstName: csvCol(row, "Billing First Name", "Billing Firstname"),
    billingLastName: csvCol(row, "Billing Last Name", "Billing Lastname"),
    billingAddress: csvCol(row, "Billing Address"),
    customerSince: csvCol(row, "Customer Since"),
    wixCustomerId: csvCol(row, "cellId"),
    emailSubscriberStatus: csvCol(row, "Email subscriber status"),
    createdAt: csvCol(row, "Created At (UTC+0)"),
    source: "csv",
  };
}

// ── Merge ─────────────────────────────────────────────────────────────────────

/** Merge two records — xlsxRecord wins on non-empty fields. */
function mergeRecords(xlsxRecord, csvRecord) {
  return {
    email: prefer(xlsxRecord.email, csvRecord.email),
    name: prefer(xlsxRecord.name, csvRecord.name),
    firstName: prefer(xlsxRecord.firstName, csvRecord.firstName),
    lastName: prefer(xlsxRecord.lastName, csvRecord.lastName),
    phone: prefer(xlsxRecord.phone, csvRecord.phone),
    company: prefer(xlsxRecord.company, csvRecord.company),
    streetAddress: prefer(xlsxRecord.streetAddress, csvRecord.streetAddress),
    city: prefer(xlsxRecord.city, csvRecord.city),
    state: prefer(xlsxRecord.state, csvRecord.state),
    zip: prefer(xlsxRecord.zip, csvRecord.zip),
    country: prefer(xlsxRecord.country, csvRecord.country),
    billingFirstName: prefer(xlsxRecord.billingFirstName, csvRecord.billingFirstName),
    billingLastName: prefer(xlsxRecord.billingLastName, csvRecord.billingLastName),
    billingAddress: prefer(xlsxRecord.billingAddress, csvRecord.billingAddress),
    customerSince: prefer(xlsxRecord.customerSince, csvRecord.customerSince),
    wixCustomerId: prefer(xlsxRecord.wixCustomerId, csvRecord.wixCustomerId),
    emailSubscriberStatus: prefer(csvRecord.emailSubscriberStatus, xlsxRecord.emailSubscriberStatus),
    createdAt: prefer(xlsxRecord.createdAt, csvRecord.createdAt),
    source: "both",
  };
}

// Map: email → merged record. Entries without email are collected separately.
const byEmail = new Map();
const noEmail = [];

function upsert(record) {
  if (record.email === "") {
    noEmail.push(record);
    return;
  }
  const existing = byEmail.get(record.email);
  if (!existing) {
    byEmail.set(record.email, record);
  } else {
    // XLSX rows win over CSV rows; "both" already merged — just fill gaps
    const xlsxSide = existing.source === "xlsx" ? existing : record;
    const csvSide = existing.source === "csv" ? existing : record;
    if (existing.source !== record.source || existing.source === "csv") {
      byEmail.set(record.email, mergeRecords(xlsxSide, csvSide));
    }
    // Same source duplicate → keep first, ignore second
  }
}

// XLSX first so it wins on conflicts
for (const row of xlsxData) {
  upsert(fromXlsx(row));
}

for (const row of csvData) {
  upsert(fromCsv(row));
}

const allRecords = [...byEmail.values(), ...noEmail];

// ── Write CSV ─────────────────────────────────────────────────────────────────

const COLUMNS = [
  "email",
  "name",
  "firstName",
  "lastName",
  "phone",
  "company",
  "streetAddress",
  "city",
  "state",
  "zip",
  "country",
  "billingFirstName",
  "billingLastName",
  "billingAddress",
  "customerSince",
  "wixCustomerId",
  "emailSubscriberStatus",
  "createdAt",
  "source",
];

const header = COLUMNS.join(",");
const lines = allRecords.map((record) =>
  COLUMNS.map((col) => csvEscape(record[col] ?? "")).join(",")
);

fs.writeFileSync(OUT_PATH, [header, ...lines].join("\n") + "\n", "utf8");

// ── Summary ───────────────────────────────────────────────────────────────────

const fromXlsxOnly = allRecords.filter((r) => r.source === "xlsx").length;
const fromCsvOnly = allRecords.filter((r) => r.source === "csv").length;
const merged = allRecords.filter((r) => r.source === "both").length;
const noEmailCount = noEmail.length;

console.log(`\nMerge complete → ${OUT_PATH}`);
console.log(`  Total records : ${allRecords.length}`);
console.log(`  From XLSX only: ${fromXlsxOnly}`);
console.log(`  From CSV only : ${fromCsvOnly}`);
console.log(`  Merged (both) : ${merged}`);
console.log(`  No email      : ${noEmailCount}`);
