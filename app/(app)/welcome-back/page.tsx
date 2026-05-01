"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { markPasswordSet } from "@/lib/actions/welcome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export default function WelcomeBackPage() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextUrl = searchParams.get("redirect_url") ?? "/";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If they already have a password set, send them on
  const hasPassword = user?.publicMetadata?.hasPassword === true;
  if (isLoaded && hasPassword) {
    router.replace(nextUrl);
    return null;
  }

  const name =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await user?.updatePassword({
        newPassword: password,
        signOutOfOtherSessions: false,
      });

      // Mark in Clerk metadata + Sanity, then redirect
      await markPasswordSet(nextUrl);
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ longMessage?: string; message?: string }> };
      const msg =
        clerkErr?.errors?.[0]?.longMessage ??
        clerkErr?.errors?.[0]?.message ??
        (err instanceof Error ? err.message : "Failed to set password. Please try again.");
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSkip() {
    router.push(nextUrl);
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <Spinner className="size-5" />
          <p className="text-sm text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex justify-center">
          <span className="inline-block rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold tracking-wide text-white dark:bg-zinc-100 dark:text-zinc-900">
            South Bay Bio
          </span>
        </div>

        <h1 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {name ? `Welcome, ${name}` : "Welcome"}
        </h1>

        <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          For additional security, please set a password for your account. You&apos;ll use it to sign in going forward.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="new-password">
              New password
            </label>
            <Input
              id="new-password"
              autoComplete="new-password"
              className="h-11"
              disabled={isSubmitting}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              type="password"
              value={password}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="confirm-password">
              Confirm password
            </label>
            <Input
              id="confirm-password"
              autoComplete="new-password"
              className="h-11"
              disabled={isSubmitting}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              type="password"
              value={confirm}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <Button className="h-11 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Spinner className="size-4" /> : null}
            <span>{isSubmitting ? "Setting password..." : "Set password and continue"}</span>
          </Button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
