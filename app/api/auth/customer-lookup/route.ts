import { NextResponse } from "next/server";

import { CUSTOMER_BY_EMAIL_QUERY } from "@/lib/sanity/queries/customers";
import { client } from "@/sanity/lib/client";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = normalizeEmail((body as { email?: unknown })?.email);
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  try {
    const customer = await client.fetch(CUSTOMER_BY_EMAIL_QUERY, { email });

    return NextResponse.json({
      found: Boolean(customer),
      customer: customer
        ? {
            email: customer.email,
            name: customer.name ?? null,
            isLegacyCustomer: Boolean(customer.isLegacyCustomer),
            welcomeShown: Boolean(customer.welcomeShown),
            clerkUserId: customer.clerkUserId ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("[customer-lookup] Failed to fetch customer:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}