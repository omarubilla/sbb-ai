import { getStripeInvoices } from "@/lib/actions/stripe-admin";
import Stripe from "stripe";
import { Receipt, Download, FileText, CheckCircle2, Clock, MoreVertical, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(timestamp * 1000));
}

export default async function InvoicesPage() {
  let invoices: any[] = [];
  let errorMsg = null;

  try {
    invoices = await getStripeInvoices();
  } catch (err: any) {
    errorMsg = err.message || "An unknown error occurred fetching invoices.";
  }

  if (errorMsg || !invoices) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center shadow-lg backdrop-blur-xl dark:border-red-900/30 dark:bg-red-950/20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <Receipt className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-900 dark:text-red-100">Connection Error</h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMsg || "Failed to load invoice data."}</p>
        </div>
      </div>
    );
  }

  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const openInvoices = invoices.filter(i => i.status === 'open').length;
  const draftInvoices = invoices.filter(i => i.status === 'draft').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Invoices
          </h1>
          <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
            Manage billing, track outstanding balances, and download receipts.
          </p>
        </div>
        <Button className="group gap-2 rounded-full bg-sky-600 px-6 shadow-md shadow-sky-500/20 transition-all hover:bg-sky-700 hover:shadow-lg hover:shadow-sky-500/40">
          <FileText className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Metric Rings */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: invoices.length, icon: Receipt, color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" },
          { label: "Paid", value: paidInvoices, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/10" },
          { label: "Open", value: openInvoices, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/10" },
          { label: "Draft", value: draftInvoices, icon: FileText, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-500/10" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-zinc-200/50 bg-white/50 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${metric.bg}`}>
              <metric.icon className={`h-5 w-5 ${metric.color}`} />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{metric.value}</p>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
        <div className="grid grid-cols-12 gap-4 border-b border-zinc-200/50 bg-zinc-50/50 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-400">
          <div className="col-span-5 sm:col-span-4">Invoice</div>
          <div className="col-span-3 hidden sm:block">Amount</div>
          <div className="col-span-3 sm:col-span-3">Status</div>
          <div className="col-span-4 text-right sm:col-span-2">Actions</div>
        </div>

        <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
          {invoices.map((invoice) => {
            let customerEmail = "Unknown Customer";
            if (invoice.customer_email) {
              customerEmail = invoice.customer_email;
            } else if (typeof invoice.customer !== "string" && invoice.customer && 'email' in invoice.customer) {
              customerEmail = invoice.customer.email || "Unknown";
            }

            return (
              <div key={invoice.id} className="group grid grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
                <div className="col-span-5 flex items-center gap-4 sm:col-span-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {invoice.number || "Draft"}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{customerEmail}</p>
                  </div>
                </div>

                <div className="col-span-3 hidden min-w-0 sm:block">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(invoice.created)}</p>
                </div>

                <div className="col-span-3 sm:col-span-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    invoice.status === "paid"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : invoice.status === "open"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      : invoice.status === "void" || invoice.status === "uncollectible"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      invoice.status === "paid" ? "bg-emerald-500"
                      : invoice.status === "open" ? "bg-amber-500"
                      : invoice.status === "void" || invoice.status === "uncollectible" ? "bg-red-500"
                      : "bg-zinc-500"
                    }`} />
                    {invoice.status}
                  </span>
                </div>

                <div className="col-span-4 flex justify-end gap-2 sm:col-span-2">
                  {invoice.invoice_pdf && (
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400">
                      <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download PDF</span>
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Options</span>
                  </Button>
                </div>
              </div>
            );
          })}
          
          {invoices.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Receipt className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No Invoices</h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                You haven't created or sent any invoices yet. Create your first invoice to get started.
              </p>
              <Button className="mt-6 rounded-full bg-sky-600 px-6 hover:bg-sky-700">
                Create Invoice
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
