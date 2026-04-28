"use server";

import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { client, writeClient } from "@/sanity/lib/client";
import {
  CUSTOMER_BY_EMAIL_QUERY,
  CUSTOMER_BY_CLERK_ID_QUERY,
} from "@/lib/sanity/queries/customers";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

/**
 * Gets or creates a Stripe customer by email
 * Also syncs the customer to Sanity database
 */
export async function getOrCreateStripeCustomer(
  email: string,
  name: string,
  clerkUserId: string
): Promise<{ stripeCustomerId: string; sanityCustomerId: string }> {
  // First, check if customer already exists in Sanity
  const existingCustomer = await client.fetch(CUSTOMER_BY_EMAIL_QUERY, {
    email,
  });

  if (existingCustomer?.stripeCustomerId) {
    // Customer exists, return existing IDs
    return {
      stripeCustomerId: existingCustomer.stripeCustomerId,
      sanityCustomerId: existingCustomer._id,
    };
  }

  // Check if customer exists in Stripe by email
  const existingStripeCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  let stripeCustomerId: string;

  if (existingStripeCustomers.data.length > 0) {
    // Customer exists in Stripe
    stripeCustomerId = existingStripeCustomers.data[0].id;
  } else {
    // Create new Stripe customer
    const newStripeCustomer = await stripe.customers.create({
      email,
      name,
      metadata: {
        clerkUserId,
      },
    });
    stripeCustomerId = newStripeCustomer.id;
  }

  // Create or update customer in Sanity
  if (existingCustomer) {
    // Update existing Sanity customer with Stripe ID
    await writeClient
      .patch(existingCustomer._id)
      .set({ stripeCustomerId, clerkUserId, name })
      .commit();
    return {
      stripeCustomerId,
      sanityCustomerId: existingCustomer._id,
    };
  }

  // Create new customer in Sanity
  const newSanityCustomer = await writeClient.create({
    _type: "customer",
    email,
    name,
    clerkUserId,
    stripeCustomerId,
    createdAt: new Date().toISOString(),
  });

  return {
    stripeCustomerId,
    sanityCustomerId: newSanityCustomer._id,
  };
}

/**
 * Returns the current signed-in user's Sanity customer profile,
 * or null if not signed in or no record found.
 * Used to pre-fill the checkout Customer Information form.
 *
 * Lookup order:
 *  1. By clerkUserId (fastest, works for users linked via webhook)
 *  2. By primary email (fallback for existing users whose record predates the webhook)
 *     — if found by email, opportunistically stamps clerkUserId on the record
 */
export async function getCustomerProfile(): Promise<{
  fullName: string;
  institution: string;
  address: string;
} | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // 1. Try by clerkUserId first
  let customer = await client.fetch(CUSTOMER_BY_CLERK_ID_QUERY, {
    clerkUserId: userId,
  });

  // 2. Fallback: look up by email and link the account
  if (!customer) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;

    if (email) {
      customer = await client.fetch(CUSTOMER_BY_EMAIL_QUERY, { email });
      if (customer) {
        // Opportunistically stamp clerkUserId so future lookups hit path 1
        await writeClient
          .patch(customer._id)
          .set({ clerkUserId: userId })
          .commit({ visibility: "async" });
      }
    }
  }

  if (!customer) return null;

  const addressParts = [
    customer.streetAddress,
    customer.city,
    customer.state,
    customer.zip,
    customer.country,
  ].filter(Boolean);

  return {
    fullName: customer.name ?? "",
    institution: customer.company ?? "",
    address: addressParts.join(", "),
  };
}
