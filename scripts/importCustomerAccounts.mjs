/**
 * Imports customer contacts from CSV/XLSX and creates Clerk invitations.
 * Also upserts Sanity customer documents so the existing webhook can link
 * accounts by email when invitees complete sign-up.
 *
 * Usage:
 *   node scripts/importCustomerAccounts.mjs
 *   node scripts/importCustomerAccounts.mjs --file ./customers.csv
 *   node scripts/importCustomerAccounts.mjs --apply
 */

import { createClient } from "@sanity/client";
import XLSX from "xlsx";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const fileArgIndex = args.indexOf("--file");
const inputPath = path.resolve(
  __dirname,
  "..",
  fileArgIndex >= 0 && args[fileArgIndex + 1]
    ? args[fileArgIndex + 1]
    : "public/SBB_customer_contacts.xlsx"
);

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: "2025-12-05",
  useCdn: false,
});

const CLERK_API_BASE = process.env.CLERK_API_URL || "https://api.clerk.com/v1";

function resolveSiteUrl() {
  const configured =
    process.env.CLERK_INVITATION_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.south-bay-bio.com";

  const normalized = configured.replace(/\/$/, "");
  return normalized.includes("localhost")
    ? "https://www.south-bay-bio.com"
    : normalized;
}

const SITE_URL = resolveSiteUrl();
const INVITE_REDIRECT_URL =
  process.env.CLERK_INVITATION_REDIRECT_URL || `${SITE_URL}/sign-up`;

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findHeaderRow(rows) {
  return rows.findIndex((row) =>
    Array.isArray(row) && row.some((cell) => normalizeHeader(cell) === "email")
  );
}

function getColumnValue(row, headerMap, possibleNames) {
  for (const name of possibleNames) {
    const index = headerMap.get(normalizeHeader(name));
    if (index !== undefined) {
      const value = row[index];
      if (value !== null && value !== undefined) {
        return String(value).trim();
      }
    }
  }

  return "";
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toSlug(email) {
  return email
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitName(fullName, fallbackFirst, fallbackLast) {
  if (fallbackFirst || fallbackLast) {
    return {
      firstName: fallbackFirst || undefined,
      lastName: fallbackLast || undefined,
    };
  }

  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: undefined, lastName: undefined };
  }

  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

async function clerkRequest(method, pathname, body) {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set");
  }

  const response = await fetch(`${CLERK_API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${pathname} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function findClerkUserByEmail(email) {
  const params = new URLSearchParams();
  params.append("email_address", email);

  const result = await clerkRequest("GET", `/users?${params.toString()}`);
  return Array.isArray(result) && result.length > 0 ? result[0] : null;
}

async function createClerkInvitation(contact) {
  return clerkRequest("POST", "/invitations", {
    email_address: contact.email,
    redirect_url: INVITE_REDIRECT_URL,
    public_metadata: {
      source: "customer-import",
      importedAt: new Date().toISOString(),
      company: contact.company || undefined,
    },
  });
}

function buildSanityDoc(contact) {
  return {
    _type: "customer",
    _id: `customer-wix-${toSlug(contact.email)}`,
    email: contact.email,
    ...(contact.name && { name: contact.name }),
    ...(contact.phone && { phone: contact.phone }),
    ...(contact.company && { company: contact.company }),
    ...(contact.wixCustomerId && { wixCustomerId: contact.wixCustomerId }),
    ...(contact.streetAddress && { streetAddress: contact.streetAddress }),
    ...(contact.city && { city: contact.city }),
    ...(contact.state && { state: contact.state }),
    ...(contact.zip && { zip: contact.zip }),
    ...(contact.country && { country: contact.country }),
    ...(contact.billingAddress && { billingAddress: contact.billingAddress }),
    ...(contact.billingFirstName && { billingFirstName: contact.billingFirstName }),
    ...(contact.billingLastName && { billingLastName: contact.billingLastName }),
    ...(contact.customerSince && { customerSince: contact.customerSince }),
    createdAt: contact.customerSince ?? new Date().toISOString(),
  };
}

const workbook = XLSX.readFile(inputPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
const headerRowIndex = findHeaderRow(rawRows);

if (headerRowIndex === -1) {
  throw new Error(`Could not find an Email header in ${inputPath}`);
}

const headers = rawRows[headerRowIndex];
const headerMap = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
const dataRows = rawRows.slice(headerRowIndex + 1);

const contacts = dataRows
  .map((row) => {
    const email = getColumnValue(row, headerMap, ["Email"]).toLowerCase();
    if (!email) return null;

    const name = getColumnValue(row, headerMap, ["Name"]);
    const billingFirstName = getColumnValue(row, headerMap, ["Billing Firstname", "Billing First Name"]);
    const billingLastName = getColumnValue(row, headerMap, ["Billing Lastname", "Billing Last Name"]);
    const { firstName, lastName } = splitName(name, billingFirstName, billingLastName);

    return {
      email,
      name,
      firstName,
      lastName,
      wixCustomerId: getColumnValue(row, headerMap, ["ID"]),
      phone: getColumnValue(row, headerMap, ["Phone"]),
      company: getColumnValue(row, headerMap, ["Company"]),
      streetAddress: getColumnValue(row, headerMap, ["Street Address"]),
      city: getColumnValue(row, headerMap, ["City"]),
      state: getColumnValue(row, headerMap, ["State/Province", "State", "Province"]),
      zip: getColumnValue(row, headerMap, ["ZIP", "Zip", "Postal Code"]),
      country: getColumnValue(row, headerMap, ["Country"]),
      billingAddress: getColumnValue(row, headerMap, ["Billing Address"]),
      billingFirstName,
      billingLastName,
      customerSince: parseDate(getColumnValue(row, headerMap, ["Customer Since"])),
    };
  })
  .filter(Boolean);

console.log(`\nParsed ${contacts.length} contacts from ${path.basename(inputPath)}.`);
console.log(`Invite redirect: ${INVITE_REDIRECT_URL}`);
console.log("\nSample (first 3):");
contacts.slice(0, 3).forEach((contact, index) => {
  console.log(
    `  [${index + 1}] ${contact.email} | ${contact.name || ""} | ${contact.company || ""}`
  );
});

if (!APPLY) {
  console.log("\n[DRY RUN] No writes. Re-run with --apply to create invitations and upsert customers.\n");
  process.exit(0);
}

if (!process.env.SANITY_API_WRITE_TOKEN) {
  throw new Error("SANITY_API_WRITE_TOKEN is not set");
}

console.log(`\nUpserting ${contacts.length} customers into Sanity...`);

const BATCH_SIZE = 50;
for (let index = 0; index < contacts.length; index += BATCH_SIZE) {
  const batch = contacts.slice(index, index + BATCH_SIZE);
  const transaction = sanityClient.transaction();

  for (const contact of batch) {
    transaction.createOrReplace(buildSanityDoc(contact));
  }

  await transaction.commit({ visibility: "async" });
  console.log(`  ✓ Sanity batch ${Math.floor(index / BATCH_SIZE) + 1}: ${batch.length} upserted`);
}

console.log(`\nCreating Clerk invitations for ${contacts.length} contacts...`);

let invited = 0;
let existing = 0;
let failed = 0;

for (const contact of contacts) {
  try {
    const existingUser = await findClerkUserByEmail(contact.email);

    if (existingUser) {
      existing += 1;
      console.log(`  ↷ Existing Clerk user: ${contact.email}`);
      continue;
    }

    await createClerkInvitation(contact);
    invited += 1;
    console.log(`  ✓ Invited: ${contact.email}`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ✗ Failed: ${contact.email} :: ${message}`);
  }
}

console.log(`\nDone. ${invited} invited, ${existing} already existed, ${failed} failed.\n`);