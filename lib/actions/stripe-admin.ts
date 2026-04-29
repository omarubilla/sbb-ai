"use server";

import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

async function checkAdmin() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await currentUser();
  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const allowedFirstName =
    process.env.ADMIN_FIRST_NAME?.trim().toLowerCase() ?? "carsten";

  if (!allowedEmail) {
    throw new Error("Forbidden: ADMIN_EMAIL not configured");
  }

  const primaryEmail =
    user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  const firstName = user?.firstName?.trim().toLowerCase() ?? "";

  if (primaryEmail?.trim().toLowerCase() !== allowedEmail || firstName !== allowedFirstName) {
    throw new Error("Forbidden");
  }
}

export async function getStripePayments(limit = 50) {
  await checkAdmin();
  try {
    const paymentIntents = await stripe.paymentIntents.list({
      limit,
      expand: ["data.customer"],
    });
    return paymentIntents.data;
  } catch (error) {
    console.error("Error fetching Stripe payments:", error);
    throw error;
  }
}

export async function getStripeInvoices(limit = 50) {
  await checkAdmin();
  try {
    const invoices = await stripe.invoices.list({
      limit,
      expand: ["data.customer"],
    });
    return invoices.data;
  } catch (error) {
    console.error("Error fetching Stripe invoices:", error);
    throw error;
  }
}

export async function getStripeBalance() {
  await checkAdmin();
  try {
    const balance = await stripe.balance.retrieve();
    return balance;
  } catch (error) {
    console.error("Error fetching Stripe balance:", error);
    throw error;
  }
}

export async function getStripeBalanceTransactions(limit = 100) {
  await checkAdmin();
  try {
    const transactions = await stripe.balanceTransactions.list({
      limit,
    });
    return transactions.data;
  } catch (error) {
    console.error("Error fetching Stripe balance transactions:", error);
    throw error;
  }
}
