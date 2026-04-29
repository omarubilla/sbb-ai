"use server";

import { createHmac } from "crypto";
import { headers } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { client, writeClient } from "@/sanity/lib/client";
import { PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products";

// ---------- Types ----------

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CheckoutCustomerInfo {
  fullName: string;
  institution: string;
  address: string;
}

interface CheckoutResult {
  success: boolean;
  url?: string;
  error?: string;
  warning?: string;
}

function isPublicHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isLocalHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local");
    return parsed.protocol === "https:" && !isLocalHost;
  } catch {
    return false;
  }
}

// ---------- Helpers ----------

/**
 * Bankful request signature: sort all non-empty params alphabetically,
 * concatenate as key+value (no separator), HMAC-SHA256 with the account
 * password as the key, hex-encoded.
 */
function buildBankfulSignature(
  params: Record<string, string>,
  signingKey: string
): string {
  const payload = Object.keys(params)
    .sort()
    .filter((k) => params[k] !== "" && params[k] != null)
    .map((k) => `${k}${params[k]}`)
    .join("");
  return createHmac("sha256", signingKey).update(payload).digest("hex");
}

async function sendPayLinkInvoiceEmail(payload: {
  to: string;
  invoiceNumber: string;
  amount: number;
  paymentUrl: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.PAYLINK_EMAIL_FROM ?? process.env.SUPPORT_EMAIL_FROM;

  if (!resendApiKey || !fromEmail) {
    return {
      ok: false,
      reason:
        "Missing RESEND_API_KEY or sender email (PAYLINK_EMAIL_FROM/SUPPORT_EMAIL_FROM).",
    };
  }

  const subject = `Invoice ${payload.invoiceNumber} - South Bay Bio`;
  const text = [
    "Hello,",
    "",
    "Your invoice is ready.",
    `Invoice: ${payload.invoiceNumber}`,
    `Amount due: $${payload.amount.toFixed(2)} USD`,
    "",
    `Pay now: ${payload.paymentUrl}`,
    "",
    "If you have any questions, reply to this email.",
    "",
    "South Bay Bio",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [payload.to],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      reason: `Resend error (${response.status}): ${errorText}`,
    };
  }

  return { ok: true };
}

// ---------- Server action ----------

export async function createBankfulCheckoutSession(
  payload: {
    items: CartItem[];
    customerInfo: CheckoutCustomerInfo;
  }
): Promise<CheckoutResult> {
  const { items, customerInfo } = payload;
  const bankfulBaseUrl = process.env.BANKFUL_API_BASE_URL;
  const bankfulUsername = process.env.BANKFUL_USERNAME;
  const bankfulPassword = process.env.BANKFUL_PASSWORD;

  if (!bankfulBaseUrl || !bankfulUsername || !bankfulPassword) {
    const missing = [
      !bankfulBaseUrl ? "BANKFUL_API_BASE_URL" : null,
      !bankfulUsername ? "BANKFUL_USERNAME" : null,
      !bankfulPassword ? "BANKFUL_PASSWORD" : null,
    ].filter((value): value is string => Boolean(value));

    console.error("Missing Bankful env vars:", missing.join(", "));
    return {
      success: false,
      error: `Payment provider is not configured (${missing.join(", ")}).`,
    };
  }

  try {
    // 1. Verify authentication
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return { success: false, error: "Please sign in to checkout" };
    }

    // 2. Validate cart
    if (!items?.length) {
      return { success: false, error: "Your cart is empty" };
    }

    // 3. Validate products against Sanity
    const productIds = items.map((i) => i.productId);
    const products = await client.fetch(PRODUCTS_BY_IDS_QUERY, {
      ids: productIds,
    });

    const validationErrors: string[] = [];
    const validatedItems: {
      product: (typeof products)[number];
      quantity: number;
    }[] = [];

    for (const item of items) {
      const product = products.find(
        (p: { _id: string }) => p._id === item.productId
      );

      if (!product) {
        validationErrors.push(`"${item.name}" is no longer available`);
        continue;
      }
      if ((product.stock ?? 0) === 0) {
        validationErrors.push(`"${product.name}" is out of stock`);
        continue;
      }
      if (item.quantity > (product.stock ?? 0)) {
        validationErrors.push(
          `Only ${product.stock} of "${product.name}" available`
        );
        continue;
      }
      validatedItems.push({ product, quantity: item.quantity });
    }

    if (validationErrors.length) {
      return { success: false, error: validationErrors.join(". ") };
    }

    const fullName = customerInfo.fullName?.trim() ?? "";
    const institution = customerInfo.institution?.trim() ?? "";
    const addressLine = customerInfo.address?.trim() ?? "";

    if (!fullName || !institution || !addressLine) {
      return {
        success: false,
        error: "Please complete name, institution/company, and address before checkout.",
      };
    }

    // 4. Compute total
    const total = validatedItems.reduce(
      (sum, { product, quantity }) => sum + (product.price ?? 0) * quantity,
      0
    );

    const userEmail = user.emailAddresses[0]?.emailAddress ?? "";

    let selectedBaseUrl: string | undefined;

    if (process.env.NODE_ENV === "production") {
      const explicitBaseUrl = process.env.BANKFUL_CALLBACK_BASE_URL;
      if (!explicitBaseUrl || !isPublicHttpsUrl(explicitBaseUrl)) {
        return {
          success: false,
          error:
            "Production checkout requires BANKFUL_CALLBACK_BASE_URL to be a valid public HTTPS URL.",
        };
      }
      selectedBaseUrl = explicitBaseUrl;
    } else {
      const reqHeaders = await headers();
      const forwardedHost = reqHeaders.get("x-forwarded-host");
      const forwardedProto = reqHeaders.get("x-forwarded-proto") ?? "https";
      const originHeader = reqHeaders.get("origin");
      const forwardedOrigin =
        forwardedHost && forwardedProto
          ? `${forwardedProto}://${forwardedHost}`
          : null;

      const candidateBaseUrls = [
        process.env.BANKFUL_CALLBACK_BASE_URL,
        process.env.NEXT_PUBLIC_BASE_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : null,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        originHeader,
        forwardedOrigin,
      ].filter((value): value is string => Boolean(value));

      selectedBaseUrl = candidateBaseUrls.find(isPublicHttpsUrl);
    }

    if (!selectedBaseUrl) {
      return {
        success: false,
        error:
          "Bankful requires a public HTTPS callback URL. Set BANKFUL_CALLBACK_BASE_URL to your deployed app URL.",
      };
    }

    const baseUrl = new URL(selectedBaseUrl).origin;

    // 5. Generate order number (used as xtl_order_id for correlation)
    const orderNumber = `SBB-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    // 6. Pre-create Sanity order so items/user data are stored before redirect
    await writeClient.create({
      _type: "order",
      orderNumber,
      clerkUserId: userId,
      email: userEmail,
      address: {
        name: fullName,
        line1: addressLine,
        line2: institution,
      },
      items: validatedItems.map((item, index) => ({
        _key: `item-${index}`,
        product: { _type: "reference" as const, _ref: item.product._id },
        quantity: item.quantity,
        priceAtPurchase: item.product.price ?? 0,
      })),
      total,
      status: "paid",
      createdAt: new Date().toISOString(),
    });

    // 7. Build Bankful hosted-page params
    const params: Record<string, string> = {
      req_username: bankfulUsername,
      req_password: bankfulPassword,
      transaction_type: "SALE",
      amount: total.toFixed(2),
      request_currency: "USD",
      xtl_order_id: orderNumber,
      url_complete: `${baseUrl}/checkout/success/bankful`,
      url_callback: `${baseUrl}/api/webhooks/bankful`,
      return_redirect_url: "Y",
    };

    // 8. Sign the params (signature is computed BEFORE adding it to the payload)
    params.signature = buildBankfulSignature(params, bankfulPassword);

    // 9. POST to Bankful hosted-page endpoint
    const response = await fetch(
      `${bankfulBaseUrl}/front-calls/go-in/hosted-page-pay`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Bankful API error:", response.status, text);
      return {
        success: false,
        error: "Payment provider error. Please try again.",
      };
    }

    const data = (await response.json()) as { redirect_url?: string };

    if (!data.redirect_url) {
      console.error("Bankful response missing redirect_url:", data);
      return {
        success: false,
        error: "Could not create payment session. Please try again.",
      };
    }

    return { success: true, url: data.redirect_url };
  } catch (error) {
    console.error("Bankful checkout error:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function createBankfulPayLink(
  payload: {
    amount: number;
    description: string;
    customerEmail?: string;
  }
): Promise<CheckoutResult> {
  const { amount, description, customerEmail } = payload;
  const bankfulBaseUrl = process.env.BANKFUL_API_BASE_URL;
  const bankfulUsername = process.env.BANKFUL_USERNAME;
  const bankfulPassword = process.env.BANKFUL_PASSWORD;

  if (!bankfulBaseUrl || !bankfulUsername || !bankfulPassword) {
    return {
      success: false,
      error: "Bankful payment provider is not fully configured.",
    };
  }

  try {
    // 1. Verify only Clerk admins can generate pay links from dashboard.
    const { userId, sessionClaims } = await auth();
    const role = sessionClaims?.publicMetadata?.role;

    if (!userId || role !== "admin") {
      return { success: false, error: "Unauthorized" };
    }

    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than zero." };
    }

    // Determine callback base URL
    let selectedBaseUrl = process.env.BANKFUL_CALLBACK_BASE_URL;
    if (!selectedBaseUrl || !isPublicHttpsUrl(selectedBaseUrl)) {
      if (process.env.NODE_ENV === "production") {
        return {
          success: false,
          error: "Production requires BANKFUL_CALLBACK_BASE_URL to be a valid public HTTPS URL.",
        };
      }
      // Fallback for local dev: Bankful AWS WAF blocks any request containing "localhost".
      // We must use a mock production URL to successfully generate a Pay Link locally.
      selectedBaseUrl = "https://southbaybio.com";
    }

    const baseUrl = new URL(selectedBaseUrl).origin;

    // Generate correlation ID
    const orderNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    // Build Bankful params
    const params: Record<string, string> = {
      req_username: bankfulUsername,
      req_password: bankfulPassword,
      transaction_type: "SALE",
      amount: amount.toFixed(2),
      request_currency: "USD",
      xtl_order_id: orderNumber,
      url_complete: `${baseUrl}/checkout/success/bankful`,
      url_callback: `${baseUrl}/api/webhooks/bankful`,
      return_redirect_url: "Y",
    };

    // Sign request
    params.signature = buildBankfulSignature(params, bankfulPassword);

    // Hit Bankful API
    const response = await fetch(
      `${bankfulBaseUrl}/front-calls/go-in/hosted-page-pay`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json"
        },
        body: new URLSearchParams(params).toString(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Bankful API error (Pay Link):", response.status, text);
      return { success: false, error: `Bankful Error (${response.status}): ${text}` };
    }

    const data = (await response.json()) as { redirect_url?: string };

    if (!data.redirect_url) {
      return { success: false, error: `Bankful returned success but no redirect_url. Response: ${JSON.stringify(data)}` };
    }

    // Save to Sanity so the merchant can see it on the dashboard
    await writeClient.create({
      _type: "paymentLink",
      invoiceNumber: description,
      amount: amount,
      url: data.redirect_url,
      status: "active",
      customerEmail: customerEmail || "",
      createdAt: new Date().toISOString(),
    });

    if (customerEmail) {
      const emailResult = await sendPayLinkInvoiceEmail({
        to: customerEmail,
        invoiceNumber: description,
        amount,
        paymentUrl: data.redirect_url,
      });

      if (!emailResult.ok) {
        console.error("Pay link email send failed:", emailResult.reason);
        return {
          success: true,
          url: data.redirect_url,
          warning:
            "Payment link created, but invoice email could not be sent. You can copy and send the link manually.",
        };
      }
    }

    return { success: true, url: data.redirect_url };
  } catch (error) {
    console.error("Bankful pay link error:", error);
    return { success: false, error: "Something went wrong generating the link." };
  }
}
