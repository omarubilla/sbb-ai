/**
 * Clerk Webhook Handler
 *
 * Listens for user.created and user.updated events.
 * When a user signs up or changes their email, we look up the matching
 * Sanity `customer` document by email and stamp clerkUserId on it.
 * If no existing customer record is found, we create one.
 *
 * Setup:
 *  1. In Clerk Dashboard → Webhooks, add endpoint: /api/webhooks/clerk
 *  2. Subscribe to events: user.created, user.updated
 *  3. Copy the signing secret → CLERK_WEBHOOK_SECRET in .env.local
 */

import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/nextjs/server";
import { writeClient, client } from "@/sanity/lib/client";
import { CUSTOMER_BY_EMAIL_QUERY } from "@/lib/sanity/queries/customers";

const clerkAdmin = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserEvent {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
}

function getPrimaryEmail(user: ClerkUserEvent): string | null {
  const primary = user.email_addresses.find(
    (e) => e.id === user.primary_email_address_id
  );
  return primary?.email_address ?? user.email_addresses[0]?.email_address ?? null;
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const headersList = await headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();

  const wh = new Webhook(secret);
  let event: { type: string; data: ClerkUserEvent };

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "user.created" && event.type !== "user.updated") {
    return NextResponse.json({ received: true });
  }

  const user = event.data;
  const email = getPrimaryEmail(user);

  if (!email) {
    return NextResponse.json({ received: true, note: "no email on user" });
  }

  const clerkUserId = user.id;
  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || null;

  try {
    const existing = await client.fetch(CUSTOMER_BY_EMAIL_QUERY, { email });

    if (existing) {
      // Patch clerkUserId (and name if we have one and it's missing)
      const patch = writeClient.patch(existing._id).set({ clerkUserId });
      if (fullName && !existing.name) {
        patch.set({ name: fullName });
      }
      await patch.commit();
      console.log(`[clerk-webhook] Linked clerkUserId to existing customer ${existing._id}`);

      // If this is a legacy (imported) customer who hasn't been welcomed yet,
      // flag their Clerk account so the app redirects them to the welcome page.
      if (existing.isLegacyCustomer && !existing.welcomeShown) {
        try {
          await clerkAdmin.users.updateUserMetadata(clerkUserId, {
            publicMetadata: { needsWelcome: true },
          });
          console.log(`[clerk-webhook] Set needsWelcome on ${clerkUserId}`);
        } catch (metaErr) {
          console.error("[clerk-webhook] Failed to set needsWelcome metadata:", metaErr);
        }
      }
    } else {
      // No matching customer — create a new one
      await writeClient.create({
        _type: "customer",
        email,
        clerkUserId,
        ...(fullName && { name: fullName }),
        createdAt: new Date().toISOString(),
      });
      console.log(`[clerk-webhook] Created new customer for ${email}`);
    }
  } catch (err) {
    console.error("[clerk-webhook] Sanity write failed:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
