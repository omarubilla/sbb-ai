"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/nextjs/server";
import { writeClient, client } from "@/sanity/lib/client";
import { CUSTOMER_BY_CLERK_ID_QUERY } from "@/lib/sanity/queries/customers";
import { redirect } from "next/navigation";

const clerkAdmin = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function markPasswordSet(nextUrl: string = "/") {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const customer = await client.fetch(CUSTOMER_BY_CLERK_ID_QUERY, { clerkUserId: userId });
  if (customer) {
    await writeClient
      .patch(customer._id)
      .set({ welcomeShown: true })
      .commit({ visibility: "async" });
  }

  await clerkAdmin.users.updateUserMetadata(userId, {
    publicMetadata: { hasPassword: true, needsWelcome: false },
  });

  redirect(nextUrl);
}

export async function dismissWelcome() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Mark welcomeShown in Sanity
  const customer = await client.fetch(CUSTOMER_BY_CLERK_ID_QUERY, {
    clerkUserId: userId,
  });
  if (customer) {
    await writeClient
      .patch(customer._id)
      .set({ welcomeShown: true })
      .commit({ visibility: "async" });
  }

  // Clear the Clerk session claim so the middleware stops redirecting
  await clerkAdmin.users.updateUserMetadata(userId, {
    publicMetadata: { needsWelcome: false },
  });

  redirect("/");
}
