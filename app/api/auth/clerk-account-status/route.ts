import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/nextjs/server";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const clerkAdmin = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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

  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ error: "Missing Clerk server configuration" }, { status: 500 });
  }

  try {
    const users = await clerkAdmin.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    const user = users.data[0];

    return NextResponse.json({
      exists: Boolean(user),
      clerkUserId: user?.id ?? null,
      hasPassword: user?.publicMetadata?.hasPassword === true,
    });
  } catch (error) {
    console.error("[clerk-account-status] Failed to check account:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
