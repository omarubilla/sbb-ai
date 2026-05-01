"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type AuthMode = "sign-in" | "sign-up" | "password" | null;

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

type ClerkAccountStatusResult = {
  exists: boolean;
  clerkUserId: string | null;
  hasPassword: boolean;
  error?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getClerkErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  const firstError =
    typeof error === "object" && error !== null && "errors" in error
      ? (error as { errors?: Array<{ code?: string; longMessage?: string; message?: string }> }).errors?.[0]
      : null;

  if (firstError?.longMessage) return firstError.longMessage;
  if (firstError?.message) return firstError.message;

  if (firstError?.code) {
    return `Authentication failed (${firstError.code}). Please try again.`;
  }

  return "Authentication failed. Please refresh and try again.";
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const result = (await response.json()) as CustomerLookupResult;
  if (!response.ok) {
    throw new Error(result.error ?? "Unable to look up customer");
  }

  return result;
}

async function lookupClerkAccountStatus(email: string): Promise<ClerkAccountStatusResult> {
  const response = await fetch("/api/auth/clerk-account-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const result = (await response.json()) as ClerkAccountStatusResult;
  if (!response.ok) {
    throw new Error(result.error ?? "Unable to look up Clerk account");
  }

  return result;
}

function getWelcomeMessage(name: string | null, email: string): string {
  return name ? `Welcome back, ${name}. We sent a code to ${email}.` : `Welcome back. We sent a code to ${email}.`;
}

// After first-time sign-in (no password set yet), redirect to welcome-back to set one
function buildPostAuthRedirect(originalRedirectUrl: string, hasPassword: boolean): string {
  if (hasPassword) return originalRedirectUrl;
  const dest = encodeURIComponent(originalRedirectUrl);
  return `/welcome-back?redirect_url=${dest}`;
}

export function CustomerEmailAuth() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? "/";
  const { isLoaded: isSignInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [customerHasPassword, setCustomerHasPassword] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
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

      if (!lookup.found) {
        setError("We don't have a customer account for that email. Please contact us at info@south-bay-bio.com.");
        setStatusMessage(null);
        setIsSubmittingEmail(false);
        return;
      }

      const clerkStatus = await lookupClerkAccountStatus(normalizedEmail);
      const hasClerkAccount = clerkStatus.exists;
      const hasPassword = clerkStatus.hasPassword;

      setCustomerHasPassword(hasPassword);

      // Returning customer with a password set — ask for it directly
      if (hasClerkAccount && hasPassword) {
        setStatusMessage(null);
        setAuthMode("password");
        setIsSubmittingEmail(false);
        return;
      }

      setStatusMessage(
        name
          ? `Welcome back, ${name}. Sending your sign-in code...`
          : "Welcome back. Sending your sign-in code..."
      );

      if (hasClerkAccount) {
        try {
          const signInAttempt = await signIn.create({ identifier: normalizedEmail });

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
          const errCode = getClerkErrorCode(signInError);
          if (errCode === "form_identifier_not_found") {
            const nameParts = name ? name.trim().split(/\s+/) : [];
            await signUp.create({
              emailAddress: normalizedEmail,
              ...(nameParts[0] && { firstName: nameParts[0] }),
              ...(nameParts.length > 1 && { lastName: nameParts.slice(1).join(" ") }),
            });
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setAuthMode("sign-up");
          } else {
            throw signInError;
          }
        }
      } else {
        try {
          const nameParts = name ? name.trim().split(/\s+/) : [];
          await signUp.create({
            emailAddress: normalizedEmail,
            ...(nameParts[0] && { firstName: nameParts[0] }),
            ...(nameParts.length > 1 && { lastName: nameParts.slice(1).join(" ") }),
          });
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setAuthMode("sign-up");
        } catch (signUpCreateError) {
          const errCode = getClerkErrorCode(signUpCreateError);
          if (errCode === "form_identifier_exists") {
            const signInAttempt = await signIn.create({ identifier: normalizedEmail });

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
      const errCode = getClerkErrorCode(submitError);
      if (errCode === "captcha_missing_token" || errCode === "captcha_invalid" || errCode === "captcha_not_enabled") {
        setError("Security check is still initializing. Please wait 2-3 seconds and try Continue again.");
        setStatusMessage(null);
        setAuthMode(null);
        return;
      }

      setError(submitError instanceof Error ? submitError.message : getClerkErrorMessage(submitError));
      setStatusMessage(null);
      setAuthMode(null);
    } finally {
      setIsSubmittingEmail(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim()) {
      setError("Enter your password to continue.");
      return;
    }

    setIsSubmittingPassword(true);
    setError(null);

    try {
      const result = await signIn?.create({
        identifier: submittedEmail,
        password: password.trim(),
      });

      if (result?.status !== "complete") {
        throw new Error(
          result?.status
            ? `Sign-in requires an additional step (${result.status}). Please contact support.`
            : "Sign-in could not be completed. Please try again."
        );
      }

      await setActiveSignIn?.({ session: result.createdSessionId, redirectUrl });
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : getClerkErrorMessage(passwordError));
    } finally {
      setIsSubmittingPassword(false);
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
      // After email-code auth, redirect to welcome-back to set a password (first time only)
      const postAuthRedirect = buildPostAuthRedirect(redirectUrl, customerHasPassword);

      if (authMode === "sign-in") {
        const result = await signIn?.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });

        if (result?.status !== "complete") {
          throw new Error(
            result?.status
              ? `Sign-in requires an additional step (${result.status}). Please contact support.`
              : "Sign-in could not be completed. Please request a new code and try again."
          );
        }

        await setActiveSignIn?.({ session: result.createdSessionId, redirectUrl: postAuthRedirect });
        return;
      }

      const result = await signUp?.attemptEmailAddressVerification({ code: code.trim() });

      if (result?.status === "missing_requirements") {
        const missing = signUp?.missingFields ?? [];
        const updatePayload: Record<string, string> = {};

        if (missing.includes("first_name") || missing.includes("last_name")) {
          const nameParts = customerName ? customerName.trim().split(/\s+/) : [];
          if (nameParts[0]) updatePayload.firstName = nameParts[0];
          if (nameParts.length > 1) updatePayload.lastName = nameParts.slice(1).join(" ");
        }

        if (missing.includes("username")) {
          const base = submittedEmail.split("@")[0].replace(/[^a-z0-9]/gi, "_").toLowerCase();
          updatePayload.username = `${base}_${Math.random().toString(36).slice(2, 6)}`;
        }

        if (missing.includes("password")) {
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
          updatePayload.password = Array.from({ length: 32 }, () =>
            chars[Math.floor(Math.random() * chars.length)]
          ).join("");
        }

        if (Object.keys(updatePayload).length > 0) {
          const updated = await signUp?.update(updatePayload);
          if (updated?.status === "complete" && updated.createdSessionId) {
            await setActiveSignUp?.({ session: updated.createdSessionId, redirectUrl: postAuthRedirect });
            return;
          }
        }

        throw new Error(
          missing.length > 0
            ? `Sign-up incomplete — missing fields: ${missing.join(", ")}. Please contact us at info@south-bay-bio.com.`
            : "Sign-up could not be completed. Please contact us at info@south-bay-bio.com."
        );
      }

      if (result?.status !== "complete") {
        throw new Error(
          result?.status
            ? `Sign-up could not be completed (${result.status}). Please contact support.`
            : "Sign-up could not be completed. Please request a new code and try again."
        );
      }

      await setActiveSignUp?.({ session: result.createdSessionId, redirectUrl: postAuthRedirect });
    } catch (verifyError) {
      if (authMode === "sign-up" && isAlreadyVerifiedError(verifyError)) {
        const completedSessionId = signUp?.createdSessionId;
        if (completedSessionId) {
          await setActiveSignUp?.({ session: completedSessionId, redirectUrl });
          return;
        }
      }

      if (authMode === "sign-in" && isAlreadyVerifiedError(verifyError)) {
        const completedSessionId = signIn?.createdSessionId;
        if (completedSessionId) {
          await setActiveSignIn?.({ session: completedSessionId, redirectUrl });
          return;
        }
      }

      setError(verifyError instanceof Error ? verifyError.message : getClerkErrorMessage(verifyError));
    } finally {
      setIsSubmittingCode(false);
    }
  }

  function resetFlow() {
    setAuthMode(null);
    setCode("");
    setPassword("");
    setCustomerName(null);
    setSubmittedEmail("");
    setCustomerHasPassword(false);
    setStatusMessage(null);
    setError(null);
  }

  async function sendCodeInstead() {
    if (!signIn || !submittedEmail) return;
    setError(null);
    setIsSubmittingEmail(true);
    try {
      const signInAttempt = await signIn.create({ identifier: submittedEmail });
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
      setStatusMessage(`We sent a code to ${submittedEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : getClerkErrorMessage(err));
    } finally {
      setIsSubmittingEmail(false);
    }
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
          {authMode !== "password" && (
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Enter your email. We&apos;ll check your customer record and send a secure code to finish sign-in.
            </p>
          )}
        </div>

        {/* Step 1: Email entry */}
        {!authMode && (
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
              <span>{isSubmittingEmail ? "Checking..." : "Continue with email"}</span>
            </Button>

            <div className="mt-2" id="clerk-captcha" />
          </form>
        )}

        {/* Step 2a: Password sign-in (returning customer with password set) */}
        {authMode === "password" && (
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {customerName ? `Welcome back, ${customerName}` : "Welcome back"}
              </p>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">{submittedEmail}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                autoComplete="current-password"
                className="h-11"
                disabled={isSubmittingPassword}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <Button className="h-11 w-full" disabled={isSubmittingPassword} type="submit">
              {isSubmittingPassword ? <Spinner className="size-4" /> : null}
              <span>{isSubmittingPassword ? "Signing in..." : "Sign in"}</span>
            </Button>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={sendCodeInstead}
                disabled={isSubmittingEmail || isSubmittingPassword}
                className="text-center text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
              >
                {isSubmittingEmail ? "Sending code..." : "Forgot password? Send me a code instead"}
              </button>
              <button
                type="button"
                onClick={resetFlow}
                className="text-center text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Use a different email
              </button>
            </div>
          </form>
        )}

        {/* Step 2b: Email code verification (first-time or no password) */}
        {(authMode === "sign-in" || authMode === "sign-up") && (
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
          Need a new customer account?{" "}
          <Link className="font-medium text-zinc-950 underline dark:text-zinc-50" href="/sign-up">
            Use the same email flow here.
          </Link>
        </p>
      </div>
    </div>
  );
}
