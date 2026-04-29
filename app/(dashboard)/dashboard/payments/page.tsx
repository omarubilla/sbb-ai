import { getStripePayments } from "@/lib/actions/stripe-admin";
import { client } from "@/sanity/lib/client";
import Stripe from "stripe";
import { Plus, CreditCard, Link as LinkIcon, MoreHorizontal, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreatePayLinkModal from "@/components/admin/CreatePayLinkModal";
import CopyButton from "@/components/admin/CopyButton";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDateStr(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  let stripePayments: any[] = [];
  let sanityLinks: any[] = [];
  let errorMsg = null;

  try {
    const [fetchedStripe, fetchedSanity] = await Promise.all([
      getStripePayments().catch(() => []), // gracefully fail if Stripe not connected
      client.fetch(`*[_type == "paymentLink"] | order(createdAt desc)`)
    ]);
    stripePayments = fetchedStripe;
    sanityLinks = fetchedSanity;
  } catch (err: any) {
    errorMsg = err.message || "An unknown error occurred fetching payments.";
  }

  const hasItems = stripePayments.length > 0 || sanityLinks.length > 0;

  if (errorMsg && !hasItems) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center shadow-lg backdrop-blur-xl dark:border-red-900/30 dark:bg-red-950/20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <CreditCard className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-900 dark:text-red-100">Connection Error</h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMsg || "Failed to load payment data."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Payment Links
          </h1>
          <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
            Create reusable links to sell products or accept payments instantly.
          </p>
        </div>
        <CreatePayLinkModal />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
        <div className="grid grid-cols-12 gap-4 border-b border-zinc-200/50 bg-zinc-50/50 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-400">
          <div className="col-span-5 sm:col-span-4">Payment Info</div>
          <div className="col-span-3 hidden sm:block">Date</div>
          <div className="col-span-3 sm:col-span-3">Status</div>
          <div className="col-span-4 text-right sm:col-span-2">Actions</div>
        </div>

        <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
          {/* Bankful Links (Sanity) */}
          {sanityLinks.map((link) => (
            <div key={link._id} className="group grid grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
              <div className="col-span-5 flex items-center gap-4 sm:col-span-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <LinkIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(link.amount, "USD")}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{link.invoiceNumber}</p>
                </div>
              </div>

              <div className="col-span-3 hidden text-sm text-zinc-500 dark:text-zinc-400 sm:block">
                {formatDateStr(link.createdAt)}
              </div>

              <div className="col-span-3 sm:col-span-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  link.status === "active"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${link.status === "active" ? "bg-amber-500" : "bg-emerald-500"}`} />
                  {link.status === "active" ? "Active" : link.status}
                </span>
              </div>

              <div className="col-span-4 flex justify-end gap-2 sm:col-span-2">
                <CopyButton text={link.url} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </div>
            </div>
          ))}

          {/* Stripe Links */}
          {stripePayments.map((payment) => {
            const customer = payment.customer as Stripe.Customer | null | string;
            let customerEmail = "Guest Checkout";
            if (customer && typeof customer !== "string" && "email" in customer && customer.email) {
              customerEmail = customer.email;
            }

            return (
              <div key={payment.id} className="group grid grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
                <div className="col-span-5 flex items-center gap-4 sm:col-span-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                    <LinkIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(payment.amount / 100, payment.currency)}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{customerEmail}</p>
                  </div>
                </div>

                <div className="col-span-3 hidden text-sm text-zinc-500 dark:text-zinc-400 sm:block">
                  {formatDate(payment.created)}
                </div>

                <div className="col-span-3 sm:col-span-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    payment.status === "succeeded"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${payment.status === "succeeded" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {payment.status}
                  </span>
                </div>

                <div className="col-span-4 flex justify-end gap-2 sm:col-span-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </div>
              </div>
            );
          })}
          
          {!hasItems && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <LinkIcon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No Payment Links yet</h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Create a payment link to instantly accept payments or sell products anywhere.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
