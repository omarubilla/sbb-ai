import { getStripeBalance, getStripeBalanceTransactions } from "@/lib/actions/stripe-admin";
import Stripe from "stripe";
import { DollarSign, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

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
  let balance;
  let transactions;
  let errorMsg = null;

  try {
    balance = await getStripeBalance();
    transactions = await getStripeBalanceTransactions(20);
  } catch (err: any) {
    errorMsg = err.message || "An unknown error occurred fetching Stripe data.";
  }

  if (errorMsg || !balance || !transactions) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
        <h2 className="text-xl font-bold">Error loading Stripe data</h2>
        <p className="mt-2 font-mono text-sm">{errorMsg || "Failed to load data."}</p>
      </div>
    );
  }

  const totalAvailable = balance.available.reduce((sum: any, b: any) => sum + b.amount, 0);
  const totalPending = balance.pending.reduce((sum: any, b: any) => sum + b.amount, 0);
  const primaryCurrency = balance.available[0]?.currency || "usd";

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">
          Financial overview and Stripe balance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Available Balance */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10">
              <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Available Balance</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(totalAvailable, primaryCurrency)}
              </h3>
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10">
              <Activity className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending Balance</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(totalPending, primaryCurrency)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Transactions
        </h2>
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Net Amount</th>
                  <th className="px-6 py-4 font-medium">Fee</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {transactions.map((tx) => {
                  const isPositive = tx.net >= 0;
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                        {tx.type.replace(/_/g, " ")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {formatDate(tx.created)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium">
                        <span className={`flex items-center gap-1 ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {formatCurrency(Math.abs(tx.net), tx.currency)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {formatCurrency(tx.fee, tx.currency)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            tx.status === "available"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
