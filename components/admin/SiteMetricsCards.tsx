"use client";

import { ExternalLink, BarChart3, Users, Eye, TrendingUp } from "lucide-react";

const VERCEL_ANALYTICS_URL =
  process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_URL ??
  "https://vercel.com/dashboard";

export function SiteMetricsCards() {
  return (
    <section className="rounded-2xl border border-zinc-200/50 bg-white/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Site Traffic
        </h2>
        <a
          href={VERCEL_ANALYTICS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/60 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ExternalLink className="h-3 w-3" />
          Open Vercel Analytics
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Unique Visitors", icon: Users, color: "from-blue-400 to-blue-600" },
          { label: "Page Views", icon: Eye, color: "from-violet-400 to-violet-600" },
          { label: "Avg Visit Duration", icon: BarChart3, color: "from-emerald-400 to-emerald-600" },
          { label: "Bounce Rate", icon: TrendingUp, color: "from-rose-400 to-rose-600" },
        ].map(({ label, icon: Icon, color }) => (
          <a
            key={label}
            href={VERCEL_ANALYTICS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950/50"
          >
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
                <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">View in Vercel →</p>
              </div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
        Pageviews are tracked automatically via{" "}
        <code className="rounded bg-zinc-100 px-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">@vercel/analytics</code>.
        Set{" "}
        <code className="rounded bg-zinc-100 px-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">NEXT_PUBLIC_VERCEL_ANALYTICS_URL</code>{" "}
        to your project&apos;s direct analytics link.
      </p>
    </section>
  );
}
