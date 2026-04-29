"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ProductSeoRow = {
  _id: string;
  name: string;
  slug: string;
  southBayBio: number;
  ubpBio: number;
  rdSystems: number;
  lastCheckedAt: string | null;
};

type FilterKey = "all" | "rank1" | "top3" | "top5" | "top10" | "notFirstPage";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "rank1", label: "#1" },
  { key: "top3", label: "Top 3" },
  { key: "top5", label: "Top 5" },
  { key: "top10", label: "Top 10" },
  { key: "notFirstPage", label: "Not on First Page" },
];

function matchesFilter(rank: number, filter: FilterKey): boolean {
  switch (filter) {
    case "all":
      return true;
    case "rank1":
      return rank === 1;
    case "top3":
      return rank > 0 && rank <= 3;
    case "top5":
      return rank > 0 && rank <= 5;
    case "top10":
      return rank > 0 && rank <= 10;
    case "notFirstPage":
      return rank === 0 || rank > 10;
    default:
      return true;
  }
}

export function SeoRankingTable({ products }: { products: ProductSeoRow[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const filteredProducts = useMemo(
    () => products.filter((product) => matchesFilter(product.southBayBio, activeFilter)),
    [products, activeFilter]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/50">
      <div className="border-b border-zinc-200/50 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800/50 dark:bg-zinc-900/50">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          South Bay Bio Rank Filters
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const isActive = filter.key === activeFilter;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                )}
              >
                {filter.label}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
            Showing {filteredProducts.length} of {products.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 border-b border-zinc-200/50 bg-zinc-50/50 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:text-zinc-400">
        <div className="col-span-6 sm:col-span-5">Product</div>
        <div className="col-span-2 text-center">South Bay Bio</div>
        <div className="col-span-2 text-center">UBP Bio</div>
        <div className="col-span-2 text-center">R&amp;D Systems</div>
        <div className="col-span-0 hidden sm:block" />
      </div>

      <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
        {filteredProducts.map((product) => (
          <div
            key={product._id}
            className="grid grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
          >
            <div className="col-span-6 sm:col-span-5">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {product.name}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">/{product.slug}</p>
            </div>

            <div className="col-span-2 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {product.southBayBio}
            </div>
            <div className="col-span-2 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {product.ubpBio}
            </div>
            <div className="col-span-2 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {product.rdSystems}
            </div>
            <div className="col-span-0 hidden sm:block" />
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              No Products In This Filter
            </h3>
            <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Try another filter to inspect a different ranking segment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
