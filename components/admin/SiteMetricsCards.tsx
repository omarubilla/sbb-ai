"use client";

import { useEffect, useState } from "react";
import { Users, Eye, TrendingDown, BarChart3, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";

interface AnalyticsSummary {
  totalPageviews?: number;
  uniqueVisitors?: number;
  bounceRate?: number;
  avgVisitDuration?: number;
  [key: string]: unknown;
}

interface TopPage {
  path: string;
  pageviews: number;
  visitors?: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  pages: TopPage[];
}

interface ErrorPayload {
  error?: string;
  missingEnv?: boolean;
  dashboardUrl?: string;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950/50">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl opacity-10" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <h3 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</h3>
          {sub && <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{sub}</p>}
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function fmt(n?: number) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtDuration(secs?: number) {
  if (secs == null || secs === 0) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function SiteMetricsCards() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [missingEnv, setMissingEnv] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  async function load(r: number) {
    setLoading(true);
    setError(null);
    setDashboardUrl(null);
    setMissingEnv(false);
    try {
      const res = await fetch(`/api/admin/analytics?range=${r}`);
      const json: AnalyticsData | ErrorPayload = await res.json();
      if (!res.ok) {
        const payload = json as ErrorPayload;
        setError(payload.error ?? "Failed to fetch analytics");
        setDashboardUrl(payload.dashboardUrl ?? null);
        setMissingEnv(payload.missingEnv ?? false);
        return;
      }
      setData(json as AnalyticsData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const ranges = [7, 30, 90];

  return (
    <section className="rounded-2xl border border-zinc-200/50 bg-white/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Site Traffic
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100/60 p-1 dark:border-zinc-700 dark:bg-zinc-800/60">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            onClick={() => load(range)}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white/60 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm dark:border-amber-800/40 dark:bg-amber-950/20">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">Analytics not connected</p>
            <p className="mt-1 text-amber-700 dark:text-amber-400">{error}</p>
            {missingEnv && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                Add{" "}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">VERCEL_ACCESS_TOKEN</code> and{" "}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">VERCEL_PROJECT_ID</code> in your
                Vercel project settings → Environment Variables.
              </p>
            )}
            {dashboardUrl && (
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
              >
                <ExternalLink className="h-3 w-3" />
                View in Vercel Dashboard
              </a>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Unique Visitors"
              value={fmt(data.summary.uniqueVisitors)}
              sub={`Last ${range} days`}
              icon={Users}
              color="from-blue-400 to-blue-600"
            />
            <StatCard
              label="Page Views"
              value={fmt(data.summary.totalPageviews)}
              sub={`Last ${range} days`}
              icon={Eye}
              color="from-violet-400 to-violet-600"
            />
            <StatCard
              label="Avg Visit Duration"
              value={fmtDuration(data.summary.avgVisitDuration as number | undefined)}
              icon={BarChart3}
              color="from-emerald-400 to-emerald-600"
            />
            <StatCard
              label="Bounce Rate"
              value={
                data.summary.bounceRate != null
                  ? `${Math.round((data.summary.bounceRate as number) * 100)}%`
                  : "—"
              }
              icon={TrendingDown}
              color="from-rose-400 to-rose-600"
            />
          </div>

          {data.pages.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Top Pages
              </p>
              <div className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Page</th>
                      <th className="px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Views</th>
                      <th className="px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pages.map((p, i) => (
                      <tr
                        key={p.path}
                        className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800 ${
                          i % 2 === 0 ? "" : "bg-zinc-50/40 dark:bg-zinc-900/20"
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">{p.path}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-600 dark:text-zinc-400">{fmt(p.pageviews)}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-600 dark:text-zinc-400">{fmt(p.visitors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
