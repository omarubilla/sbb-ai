import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { CUSTOMER_BY_CLERK_ID_QUERY } from "@/lib/sanity/queries/customers";
import { dismissWelcome } from "@/lib/actions/welcome";

export default async function WelcomeBackPage() {
  const { userId, sessionClaims } = await auth();

  // If they're not signed in or don't actually need the welcome, send them home
  const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
  if (!userId || meta?.needsWelcome !== true) {
    redirect("/");
  }

  const customer = await client.fetch(CUSTOMER_BY_CLERK_ID_QUERY, {
    clerkUserId: userId,
  });

  // Fall back to Clerk display name if Sanity has no name
  const clerkUser = await currentUser();
  const name =
    customer?.name ||
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        {/* Logo / brand mark */}
        <div className="mb-6 flex justify-center">
          <span className="inline-block rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold tracking-wide text-white dark:bg-zinc-100 dark:text-zinc-900">
            South Bay Bio
          </span>
        </div>

        <h1 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {name ? `Welcome back, ${name}` : "Welcome back"}
        </h1>

        <p className="mt-4 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {name
            ? `Welcome ${name}, please reset your password for additional security. Thank you.`
            : "Please reset your password for additional security. Thank you."}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {/* Reset password — Clerk's hosted user profile handles this */}
          <a
            href="/sign-in?redirect_url=/welcome-back#reset-password"
            className="flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Reset my password
          </a>

          {/* Continue without resetting */}
          <form action={dismissWelcome}>
            <button
              type="submit"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Continue to site
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
