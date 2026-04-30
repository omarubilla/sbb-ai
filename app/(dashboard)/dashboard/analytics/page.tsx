import { getStripeBalance, getStripeBalanceTransactions } from "@/lib/actions/stripe-admin";
import Stripe from "stripe";
import { DollarSign, ArrowUpRight, ArrowDownRight, Activity, Wallet } from "lucide-react";
import { TrafficChart } from "@/components/admin/TrafficChart";
import { SeoControls } from "@/components/admin/SeoControls";
import { SearchConsolePanel } from "@/components/admin/SearchConsolePanel";
import { SiteMetricsCards } from "@/components/admin/SiteMetricsCards";
import { client } from "@/sanity/lib/client";

const SEO_META_QUERY = `{
  "latestCheckedAt": *[_type == "product" && defined(seoLastCheckedAt)] | order(seoLastCheckedAt desc)[0].seoLastCheckedAt
}`;

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

export default async function AnalyticsPage() {
  const seoMeta = await client.fetch<{ latestCheckedAt: string | null }>(SEO_META_QUERY);
  const latestCheckedText = seoMeta.latestCheckedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(seoMeta.latestCheckedAt))
    : "Not refreshed yet";

  let balance;
  let transactions;
  let errorMsg = null;

  try {
    balance = await getStripeBalance();
    transactions = await getStripeBalanceTransactions(30);
  } catch (err: any) {
    errorMsg = err.message || "An unknown error occurred fetching Stripe data.";
  }

  if (errorMsg || !balance || !transactions) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Traffic & Revenue
          </h1>
          <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
            Monitor your real-time financial metrics and payment flow.
          </p>
        </div>

        <SiteMetricsCards />

        <SearchConsolePanel />

        <section className="rounded-2xl border border-zinc-200/50 bg-white/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              SEO Controls
            </h2>
          </div>
          <SeoControls initialLastRefresh={latestCheckedText} />
        </section>

        <div className="flex h-[35vh] w-full items-center justify-center">
          <div className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center shadow-lg backdrop-blur-xl dark:border-red-900/30 dark:bg-red-950/20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <Activity className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-red-900 dark:text-red-100">Connection Error</h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMsg || "Failed to establish a secure connection to Stripe."}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalAvailable = balance.available.reduce((sum: any, b: any) => sum + b.amount, 0);
  const totalPending = balance.pending.reduce((sum: any, b: any) => sum + b.amount, 0);
  const primaryCurrency = balance.available[0]?.currency || "usd";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Traffic & Revenue
        </h1>
        <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
          Monitor your real-time financial metrics and payment flow.
        </p>
      </div>

      <SiteMetricsCards />

      <SearchConsolePanel />

      <section className="rounded-2xl border border-zinc-200/50 bg-white/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            SEO Controls
          </h2>
        </div>
        <SeoControls initialLastRefresh={latestCheckedText} />
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Available Balance Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950/50">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Available to Payout</p>
              <h3 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(totalAvailable, primaryCurrency)}
              </h3>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Pending Balance Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950/50">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending Clearance</p>
              <h3 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(totalPending, primaryCurrency)}
              </h3>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
              <Activity className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <TrafficChart transactions={transactions} primaryCurrency={primaryCurrency} />

    </div>
  );
}
