"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type AuthMode = "sign-in" | "sign-up" | null;

type CustomerLookupResult = {
  found: boolean;
  customer: {
    email: string;
    name: string | null;
    isLegacyCustomer: boolean;
    welcomeShown: boolean;
    clerkUserId: string | null;
  } | null;
  error?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getClerkErrorMessage(error: unknown): string {
  const message =
    typeof error === "object" && error !== null && "errors" in error
      ? (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors?.[0]
      : null;

  return message?.longMessage ?? message?.message ?? "Something went wrong. Please try again.";
}

function getClerkErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("errors" in error)) {
    return null;
  }

  const firstError = (error as { errors?: Array<{ code?: string }> }).errors?.[0];
  return firstError?.code ?? null;
}

function isAlreadyVerifiedError(error: unknown): boolean {
  const code = getClerkErrorCode(error);
  if (code === "verification_already_verified" || code === "form_code_already_verified") {
    return true;
  }

  const message = getClerkErrorMessage(error).toLowerCase();
  return message.includes("already been verified");
}

async function lookupCustomer(email: string): Promise<CustomerLookupResult> {
  const response = await fetch("/api/auth/customer-lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const result = (await response.json()) as CustomerLookupResult;
  if (!response.ok) {
    throw new Error(result.error ?? "Unable to look up customer");
  }

  return result;
}

function getWelcomeMessage(name: string | null, email: string): string {
  return name ? `Welcome back, ${name}. We sent a code to ${email}.` : `Welcome back. We sent a code to ${email}.`;
}

export function CustomerEmailAuth() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? "/";
  const { isLoaded: isSignInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isLoaded = isSignInLoaded && isSignUpLoaded && Boolean(signIn) && Boolean(signUp);

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn || !signUp) return;

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError("Enter your email address to continue.");
      return;
    }

    setIsSubmittingEmail(true);
    setError(null);
    setStatusMessage("Checking our customer records...");

    try {
      const lookup = await lookupCustomer(normalizedEmail);
      const name = lookup.customer?.name ?? null;

      setCustomerName(name);
      setSubmittedEmail(normalizedEmail);

      // Unknown email — block here, never touch Clerk
      if (!lookup.found) {
        setError("We don't have a customer account for that email. Please contact us at info@south-bay-bio.com.");
        setStatusMessage(null);
        setIsSubmittingEmail(false);
        return;
      }

      setStatusMessage(
        name
          ? `Welcome back, ${name}. Sending your sign-in code...`
          : "Welcome back. Sending your sign-in code..."
      );

      // Route based on whether the customer already has a Clerk account.
      // clerkUserId present → they've signed in before → use sign-in path.
      // clerkUserId absent → first-time Clerk account creation → use sign-up path.
      const hasClerkAccount = Boolean(lookup.customer?.clerkUserId);

      if (hasClerkAccount) {
        try {
          const signInAttempt = await signIn.create({
            identifier: normalizedEmail,
          });

          const emailFactor = signInAttempt.supportedFirstFactors?.find(
            (factor) => factor.strategy === "email_code" && "emailAddressId" in factor
          );

          if (!emailFactor || !("emailAddressId" in emailFactor)) {
            throw new Error("Email code sign-in is not available for this account.");
          }

          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });

          setAuthMode("sign-in");
        } catch (signInError) {
          // Stale clerkUserId in Sanity (Clerk account deleted/recreated) — fall back to sign-up
          const errCode = (signInError as { errors?: Array<{ code?: string }> })?.errors?.[0]?.code;
          if (errCode === "form_identifier_not_found") {
            await signUp.create({ emailAddress: normalizedEmail });
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setAuthMode("sign-up");
          } else {
            throw signInError;
          }
        }
      } else {
        // Known customer who has never signed into Clerk — create their account now.
        try {
          await signUp.create({ emailAddress: normalizedEmail });
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setAuthMode("sign-up");
        } catch (signUpCreateError) {
          // Clerk account may already exist even if Sanity clerkUserId is empty.
          // Fall back to sign-in in that case.
          const errCode = getClerkErrorCode(signUpCreateError);
          if (errCode === "form_identifier_exists") {
            const signInAttempt = await signIn.create({
              identifier: normalizedEmail,
            });

            const emailFactor = signInAttempt.supportedFirstFactors?.find(
              (factor) => factor.strategy === "email_code" && "emailAddressId" in factor
            );

            if (!emailFactor || !("emailAddressId" in emailFactor)) {
              throw new Error("Email code sign-in is not available for this account.");
            }

            await signIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: emailFactor.emailAddressId,
            });

            setAuthMode("sign-in");
          } else {
            throw signUpCreateError;
          }
        }
      }

      setStatusMessage(getWelcomeMessage(name, normalizedEmail));

      setCode("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : getClerkErrorMessage(submitError)
      );
      setStatusMessage(null);
      setAuthMode(null);
    } finally {
      setIsSubmittingEmail(false);
    }
  }

  async function handleCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authMode || !code.trim()) {
      setError("Enter the verification code from your email.");
      return;
    }

    setIsSubmittingCode(true);
    setError(null);

    try {
      if (authMode === "sign-in") {
        const result = await signIn?.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });

        if (!result?.createdSessionId) {
          throw new Error("We could not complete sign-in with that code.");
        }

        await setActiveSignIn?.({
          session: result.createdSessionId,
          redirectUrl,
        });
        return;
      }

      const result = await signUp?.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (!result?.createdSessionId) {
        throw new Error("We could not complete sign-in with that code.");
      }

      await setActiveSignUp?.({
        session: result.createdSessionId,
        redirectUrl,
      });
    } catch (verifyError) {
      if (authMode === "sign-up" && isAlreadyVerifiedError(verifyError)) {
        const completedSessionId = signUp?.createdSessionId;
        if (completedSessionId) {
          await setActiveSignUp?.({
            session: completedSessionId,
            redirectUrl,
          });
          return;
        }
      }

      if (authMode === "sign-in" && isAlreadyVerifiedError(verifyError)) {
        const completedSessionId = signIn?.createdSessionId;
        if (completedSessionId) {
          await setActiveSignIn?.({
            session: completedSessionId,
            redirectUrl,
          });
          return;
        }
      }

      setError(getClerkErrorMessage(verifyError));
    } finally {
      setIsSubmittingCode(false);
    }
  }

  function resetFlow() {
    setAuthMode(null);
    setCode("");
    setCustomerName(null);
    setSubmittedEmail("");
    setStatusMessage(null);
    setError(null);
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <Spinner className="size-5" />
          <p className="text-sm text-zinc-600">Loading secure sign-in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            South Bay Bio
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
            Customer Sign In
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Enter your email. We&apos;ll check your customer record, welcome you by name when we can,
            and send a secure Clerk code to finish sign-in.
          </p>
        </div>

        {!authMode ? (
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="email">
                Email address
              </label>
              <Input
                id="email"
                autoComplete="email"
                className="h-11"
                disabled={isSubmittingEmail}
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                type="email"
                value={email}
              />
            </div>

            {statusMessage ? (
              <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {isSubmittingEmail ? <Spinner className="size-4" /> : null}
                <span>{statusMessage}</span>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <Button className="h-11 w-full" disabled={isSubmittingEmail} type="submit">
              {isSubmittingEmail ? <Spinner className="size-4" /> : null}
              <span>{isSubmittingEmail ? "Checking and sending code..." : "Continue with email"}</span>
            </Button>

            <div className="mt-2" id="clerk-captcha" />
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleCodeSubmit}>
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {customerName ? `Welcome back, ${customerName}` : "Welcome back"}
              </p>
              <p className="mt-1">We sent a verification code to {submittedEmail}.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="code">
                Verification code
              </label>
              <Input
                id="code"
                autoComplete="one-time-code"
                className="h-11"
                disabled={isSubmittingCode}
                inputMode="numeric"
                onChange={(event) => setCode(event.target.value)}
                placeholder="Enter the code from your email"
                value={code}
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <Button className="h-11 w-full" disabled={isSubmittingCode} type="submit">
              {isSubmittingCode ? <Spinner className="size-4" /> : null}
              <span>{isSubmittingCode ? "Verifying code..." : "Verify and continue"}</span>
            </Button>

            <Button className="h-11 w-full" onClick={resetFlow} type="button" variant="outline">
              Use a different email
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Need a new customer account? <Link className="font-medium text-zinc-950 underline dark:text-zinc-50" href="/sign-up">Use the same email flow here.</Link>
        </p>
      </div>
    </div>
  );
}