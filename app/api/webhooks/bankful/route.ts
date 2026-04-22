import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { writeClient, client } from "@/sanity/lib/client";
import {
  ORDER_BY_BANKFUL_TRANSACTION_ID_QUERY,
  ORDER_BY_ORDER_NUMBER_QUERY,
} from "@/lib/sanity/queries/orders";

/**
 * Bankful Callback Handler
 *
 * Bankful asynchronously POSTs to this URL (url_callback) after a payment.
 * The body is application/x-www-form-urlencoded and includes a SIGNATURE field
 * that we verify before trusting the payload.
 *
 * Signature algorithm (same as outbound request signing):
 *   sort all params except SIGNATURE alphabetically, filter empties,
 *   concatenate key+value (no separator), HMAC-SHA256 with BANKFUL_PASSWORD,
 *   hex-encode.
 *
 * Key params returned:
 *   TRANS_STATUS_NAME  — "APPROVED" | "DECLINED" | "FAILED"
 *   TRANS_RECORD_ID    — Bankful's transaction record ID
 *   XTL_ORDER_ID       — the xtl_order_id we sent (== Sanity orderNumber)
 *   TRANS_VALUE        — amount as decimal string
 *   SIGNATURE          — verification signature
 */

function verifyBankfulSignature(
  params: Record<string, string>,
  received: string,
  signingKey: string
): boolean {
  const payload = Object.keys(params)
    .filter((k) => k !== "SIGNATURE" && params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  const expected = createHmac("sha256", signingKey)
    .update(payload)
    .digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(received.toLowerCase()),
      Buffer.from(expected.toLowerCase())
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const bankfulPassword = process.env.BANKFUL_PASSWORD;
  if (!bankfulPassword) {
    console.error("BANKFUL_PASSWORD is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const params = Object.fromEntries(new URLSearchParams(body).entries());

  const {
    SIGNATURE,
    TRANS_STATUS_NAME,
    TRANS_RECORD_ID,
    XTL_ORDER_ID,
    TRANS_VALUE,
  } = params;

  if (!SIGNATURE) {
    return NextResponse.json(
      { error: "Missing SIGNATURE field" },
      { status: 400 }
    );
  }

  if (!verifyBankfulSignature(params, SIGNATURE, bankfulPassword)) {
    console.error("Bankful webhook: signature verification failed");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  if (TRANS_STATUS_NAME === "APPROVED") {
    await handleApproved({ XTL_ORDER_ID, TRANS_RECORD_ID, TRANS_VALUE });
  } else {
    console.log(
      `Bankful callback: non-approved status "${TRANS_STATUS_NAME}" for order ${XTL_ORDER_ID}`
    );
  }

  return NextResponse.json({ received: true });
}

async function handleApproved({
  XTL_ORDER_ID,
  TRANS_RECORD_ID,
  TRANS_VALUE,
}: {
  XTL_ORDER_ID?: string;
  TRANS_RECORD_ID?: string;
  TRANS_VALUE?: string;
}) {
  if (!XTL_ORDER_ID || !TRANS_RECORD_ID) {
    console.error("Bankful webhook: missing XTL_ORDER_ID or TRANS_RECORD_ID", {
      XTL_ORDER_ID,
      TRANS_RECORD_ID,
    });
    return;
  }

  try {
    // Idempotency: skip if we've already processed this transaction
    const alreadyProcessed = await client.fetch(
      ORDER_BY_BANKFUL_TRANSACTION_ID_QUERY,
      { bankfulTransactionId: TRANS_RECORD_ID }
    );
    if (alreadyProcessed) {
      console.log(
        `Bankful webhook: already processed TRANS_RECORD_ID=${TRANS_RECORD_ID}, skipping`
      );
      return;
    }

    // Find the pre-created Sanity order by orderNumber (== XTL_ORDER_ID)
    const order = await client.fetch(ORDER_BY_ORDER_NUMBER_QUERY, {
      orderNumber: XTL_ORDER_ID,
    });

    if (!order) {
      console.error(
        `Bankful webhook: no order found for XTL_ORDER_ID=${XTL_ORDER_ID}`
      );
      return;
    }

    // Stamp the Bankful transaction ID on the order
    await writeClient
      .patch(order._id)
      .set({ bankfulTransactionId: TRANS_RECORD_ID })
      .commit();

    console.log(
      `Bankful order confirmed: ${order._id} → TRANS_RECORD_ID=${TRANS_RECORD_ID} TRANS_VALUE=${TRANS_VALUE}`
    );

    // Decrement stock for all ordered products
    const itemData = (
      order.itemData as { productId: string; quantity: number }[] | null
    ) ?? [];

    if (itemData.length) {
      await itemData
        .reduce(
          (tx, { productId, quantity }) =>
            tx.patch(productId, (p) => p.dec({ stock: quantity })),
          writeClient.transaction()
        )
        .commit();

      console.log(
        `Bankful webhook: decremented stock for ${itemData.length} products`
      );
    }
  } catch (error) {
    console.error("Bankful webhook: error handling approved transaction", error);
    throw error; // re-throw so Bankful retries delivery
  }
}

