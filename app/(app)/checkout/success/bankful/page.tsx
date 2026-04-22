import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SuccessClient } from "../SuccessClient";

/**
 * Bankful return URL page.
 *
 * After the customer completes payment on Bankful's hosted page they are
 * redirected here with query params:
 *   TRANS_STATUS_NAME  — "APPROVED" | "DECLINED" | "FAILED"
 *   TRANS_RECORD_ID    — Bankful's transaction record ID
 *   TRANS_ORDER_ID     — Bankful's internal order ID
 *   XTL_ORDER_ID       — the xtl_order_id we passed (== Sanity orderNumber)
 *   TRANS_VALUE        — total amount as decimal string
 *   TRANS_CUR          — currency code
 *   SIGNATURE          — HMAC-SHA256 verification signature
 *
 * The Bankful webhook (url_callback) handles persisting the transaction ID
 * and decrementing stock asynchronously.
 */

export const metadata: Metadata = {
  title: "Order Confirmed | South Bay Bio",
  description: "Confirmation page for completed South Bay Bio orders.",
  robots: {
    index: false,
    follow: false,
  },
};

interface BankfulSuccessPageProps {
  searchParams: Promise<{
    TRANS_STATUS_NAME?: string;
    TRANS_RECORD_ID?: string;
    TRANS_ORDER_ID?: string;
    XTL_ORDER_ID?: string;
    TRANS_VALUE?: string;
    TRANS_CUR?: string;
    SIGNATURE?: string;
  }>;
}

export default async function BankfulSuccessPage({
  searchParams,
}: BankfulSuccessPageProps) {
  const params = await searchParams;

  // Redirect if payment was not approved
  if (
    !params.TRANS_RECORD_ID ||
    params.TRANS_STATUS_NAME !== "APPROVED"
  ) {
    redirect("/checkout");
  }

  // amountTotal in cents (SuccessClient expects cents like Stripe)
  const amountTotal = params.TRANS_VALUE
    ? Math.round(parseFloat(params.TRANS_VALUE) * 100)
    : null;

  const session = {
    id: params.TRANS_RECORD_ID,
    customerEmail: null,
    customerName: null,
    amountTotal,
    paymentStatus: "paid",
    shippingAddress: null,
    lineItems: [],
  };

  return <SuccessClient session={session} />;
}
