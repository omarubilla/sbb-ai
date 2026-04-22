"use server";

import { createHmac } from "crypto";
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

interface CheckoutResult {
  success: boolean;
  url?: string;
  error?: string;
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

// ---------- Server action ----------

export async function createBankfulCheckoutSession(
  items: CartItem[]
): Promise<CheckoutResult> {
  const bankfulBaseUrl = process.env.BANKFUL_API_BASE_URL;
  const bankfulUsername = process.env.BANKFUL_USERNAME;
  const bankfulPassword = process.env.BANKFUL_PASSWORD;

  if (!bankfulBaseUrl || !bankfulUsername || !bankfulPassword) {
    console.error("Missing Bankful env vars (BANKFUL_API_BASE_URL / BANKFUL_USERNAME / BANKFUL_PASSWORD)");
    return { success: false, error: "Payment provider is not configured." };
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

    // 4. Compute total
    const total = validatedItems.reduce(
      (sum, { product, quantity }) => sum + (product.price ?? 0) * quantity,
      0
    );

    const userEmail = user.emailAddresses[0]?.emailAddress ?? "";
    const rawBaseUrl =
      process.env.BANKFUL_CALLBACK_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3000";

    let baseUrl: string;
    try {
      const parsed = new URL(rawBaseUrl);
      const isLocalHost =
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "0.0.0.0";

      // Bankful cannot call localhost callback/return URLs and expects publicly reachable HTTPS URLs.
      if (isLocalHost || parsed.protocol !== "https:") {
        return {
          success: false,
          error:
            "Bankful requires a public HTTPS callback URL. Set BANKFUL_CALLBACK_BASE_URL to your deployed app URL.",
        };
      }

      baseUrl = parsed.origin;
    } catch {
      return {
        success: false,
        error:
          "Invalid Bankful callback URL configuration. Check BANKFUL_CALLBACK_BASE_URL.",
      };
    }

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

