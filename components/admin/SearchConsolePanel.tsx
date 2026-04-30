"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ExternalLink,
  FileCheck2,
  FileSearch,
  LoaderCircle,
  MousePointerClick,
  Search,
} from "lucide-react";

type MetricTableRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type InspectionRow = {
  url: string;
  verdict: string;
  coverageState: string;
  lastCrawlTime: string | null;
  referringUrls: string[];
};

type SearchConsoleData = {
  configured: boolean;
  property?: string;
  error?: string;
  requirements?: string[];
  period?: {
    startDate: string;
    endDate: string;
  };
  performance?: {
    clicks: number;
    impressions: number;
    ctr: number;
    avgPosition: number;
    topQueries: MetricTableRow[];
    topPages: MetricTableRow[];
    topCountries: MetricTableRow[];
    topDevices: MetricTableRow[];
  };
  indexing?: {
    sitemapUrl: string;
    sitemapUrlCount: number;
    inspectedUrlCount: number;
    indexed: number;
    unindexed: number;
    unknown: number;
    limitations: string[];
    reasonBreakdown: Array<{ reason: string; count: number }>;
    pages: InspectionRow[];
    failures: string[];
  };
};

function numberFormatter(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function percentFormatter(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function positionFormatter(value: number) {
  return value ? value.toFixed(1) : "-";
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: typeof Search;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/50 bg-white/50 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
        </div>
        <div className="rounded-2xl bg-zinc-900 p-3 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function TableCard({
  title,
  rows,
}: {
  title: string;
  rows: MetricTableRow[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/50 bg-white/50 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No data yet.</p>
        ) : (
          rows.slice(0, 5).map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{row.key}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {numberFormatter(row.clicks)} clicks, {numberFormatter(row.impressions)} impressions
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-zinc-500 dark:text-zinc-400">
                <div>{percentFormatter(row.ctr)}</div>
                <div>Pos {positionFormatter(row.position)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SearchConsolePanel() {
  const [data, setData] = useState<SearchConsoleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/admin/search-console", { cache: "no-store" });
        const json = (await response.json()) as SearchConsoleData;

        if (active) {
          setData(json);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-zinc-200/50 bg-white/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Search Console
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Google search performance plus an indexed snapshot derived from your sitemap URLs.
          </p>
        </div>
        {data?.property ? (
          <div className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            {data.property}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center text-zinc-500 dark:text-zinc-400">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          Loading Search Console data
        </div>
      ) : !data?.configured ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Search Console is not fully configured yet.
          </p>
          {data?.error ? (
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">{data.error}</p>
          ) : null}
          <div className="mt-3 space-y-2 text-sm text-amber-800 dark:text-amber-300">
            {(data?.requirements || []).map((requirement) => (
              <p key={requirement}>{requirement}</p>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Clicks" value={numberFormatter(data.performance?.clicks || 0)} icon={MousePointerClick} />
            <StatCard title="Impressions" value={numberFormatter(data.performance?.impressions || 0)} icon={Search} />
            <StatCard title="CTR" value={percentFormatter(data.performance?.ctr || 0)} icon={Activity} />
            <StatCard title="Avg Position" value={positionFormatter(data.performance?.avgPosition || 0)} icon={FileSearch} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TableCard title="Top Queries" rows={data.performance?.topQueries || []} />
            <TableCard title="Top Pages" rows={data.performance?.topPages || []} />
            <TableCard title="Top Countries" rows={data.performance?.topCountries || []} />
            <TableCard title="Top Devices" rows={data.performance?.topDevices || []} />
          </div>

          <div className="rounded-2xl border border-zinc-200/50 bg-white/50 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Index Coverage Snapshot
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Based on sitemap URL inspection, not Google&apos;s full bulk coverage report.
                </p>
              </div>
              <a
                href={data.indexing?.sitemapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/60 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ExternalLink className="h-3 w-3" />
                Open Sitemap
              </a>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Indexed" value={numberFormatter(data.indexing?.indexed || 0)} icon={FileCheck2} />
              <StatCard title="Not Indexed" value={numberFormatter(data.indexing?.unindexed || 0)} icon={FileSearch} />
              <StatCard title="Inspected" value={numberFormatter(data.indexing?.inspectedUrlCount || 0)} icon={Activity} />
              <StatCard title="Total In Sitemap" value={numberFormatter(data.indexing?.sitemapUrlCount || 0)} icon={Search} />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Coverage Reasons</h4>
                <div className="mt-3 space-y-2">
                  {(data.indexing?.reasonBreakdown || []).slice(0, 8).map((entry) => (
                    <div key={entry.reason} className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800">
                      <span className="text-zinc-700 dark:text-zinc-300">{entry.reason}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Inspection Notes</h4>
                <div className="mt-3 space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {(data.indexing?.limitations || []).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                  {(data.indexing?.failures || []).slice(0, 3).map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50/70 dark:bg-zinc-900/40">
                  <tr>
                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">URL</th>
                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Coverage</th>
                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Verdict</th>
                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Last Crawl</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.indexing?.pages || []).slice(0, 12).map((page) => (
                    <tr key={page.url} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="max-w-[24rem] truncate px-4 py-3 text-zinc-700 dark:text-zinc-300">{page.url}</td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{page.coverageState}</td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{page.verdict}</td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                        {page.lastCrawlTime ? new Date(page.lastCrawlTime).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}