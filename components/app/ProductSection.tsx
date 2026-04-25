"use client";

import { useEffect, useRef, useState } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductFilters } from "./ProductFilters";
import { ProductGrid } from "./ProductGrid";
import { CategoryProductList } from "./CategoryProductList";
import type {
  ALL_CATEGORIES_QUERYResult,
  FILTER_PRODUCTS_BY_NAME_QUERYResult,
} from "@/sanity.types";

interface ProductSectionProps {
  categories: ALL_CATEGORIES_QUERYResult;
  products: FILTER_PRODUCTS_BY_NAME_QUERYResult;
  allFilterProducts?: FILTER_PRODUCTS_BY_NAME_QUERYResult;
  searchQuery: string;
  variant?: "grid" | "category-list";
  basePath?: string;
  lockedCategorySlug?: string;
  enableScrollableProductPane?: boolean;
  constrainFilterSidebar?: boolean;
  largeFilterSidebar?: boolean;
  syncProductPaneToSidebar?: boolean;
}

export function ProductSection({
  categories,
  products,
  allFilterProducts,
  searchQuery,
  variant = "grid",
  basePath = "/",
  lockedCategorySlug,
  enableScrollableProductPane = false,
  constrainFilterSidebar = true,
  largeFilterSidebar = false,
  syncProductPaneToSidebar = false,
}: ProductSectionProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const isCategoryList = variant === "category-list";
  const filterProductsSource = allFilterProducts ?? products;
  const sidebarContentRef = useRef<HTMLDivElement | null>(null);
  const [syncedPaneHeight, setSyncedPaneHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!syncProductPaneToSidebar || !filtersOpen) {
      setSyncedPaneHeight(null);
      return;
    }

    const target = sidebarContentRef.current;
    if (!target) return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(target.getBoundingClientRect().height);
      setSyncedPaneHeight(nextHeight > 0 ? nextHeight : null);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [syncProductPaneToSidebar, filtersOpen]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with results count and filter toggle */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {products.length} {products.length === 1 ? "product" : "products"}{" "}
          found
          {searchQuery && (
            <span>
              {" "}
              for &quot;<span className="font-medium">{searchQuery}</span>&quot;
            </span>
          )}
        </p>

        {/* Filter toggle button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 border-zinc-300 bg-white shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          aria-label={filtersOpen ? "Hide filters" : "Show filters"}
        >
          {filtersOpen ? (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="hidden sm:inline">Hide Filters</span>
              <span className="sm:hidden">Hide</span>
            </>
          ) : (
            <>
              <PanelLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Show Filters</span>
              <span className="sm:hidden">Filters</span>
            </>
          )}
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Sidebar Filters - completely hidden when collapsed on desktop */}
        <aside
          className={`shrink-0 transition-all duration-300 ease-in-out ${
            filtersOpen ? "w-full lg:w-72 lg:opacity-100" : "hidden lg:hidden"
          }`}
        >
          <div
            ref={sidebarContentRef}
            className={
              constrainFilterSidebar
                ? "lg:sticky lg:top-28 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1"
                : "lg:pr-1"
            }
          >
            <ProductFilters
              categories={categories}
              categoryProducts={filterProductsSource
                .filter((p) => p.name && p.slug)
                .map((p) => ({
                  name: p.name,
                  slug: p.slug,
                  subcategorySlug:
                    (
                      p as unknown as {
                        subcategory?: { slug?: string | null } | null;
                      }
                    ).subcategory?.slug ?? null,
                }))}
              basePath={basePath}
              hideCategorySelect={Boolean(lockedCategorySlug)}
              lockedCategorySlug={lockedCategorySlug}
              largeTypography={largeFilterSidebar}
            />

            {syncProductPaneToSidebar && (
              <div className="mt-4 border-b border-zinc-300 dark:border-zinc-700" />
            )}
          </div>
        </aside>

        {/* Product Grid - expands to full width when filters hidden */}
        <main
          className={`min-w-0 flex-1 transition-all duration-300 ${
            enableScrollableProductPane || syncProductPaneToSidebar
              ? "lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1"
              : ""
          }`}
          style={
            syncProductPaneToSidebar && syncedPaneHeight
              ? {
                  maxHeight: `${syncedPaneHeight}px`,
                  overflowY: "auto",
                }
              : undefined
          }
        >
          {isCategoryList ? (
            <CategoryProductList products={products} />
          ) : (
            <ProductGrid products={products} />
          )}
        </main>
      </div>
    </div>
  );
}
