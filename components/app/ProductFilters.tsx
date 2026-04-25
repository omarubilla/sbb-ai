"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { COLORS, MATERIALS, SORT_OPTIONS } from "@/lib/constants/filters";
import { CHAINS_SUBCATEGORIES } from "@/lib/constants/chains-subcategories";
import { sortProteasomeSubcategories } from "@/lib/constants/proteasome-subcategories";
import { UB_CONJUGATION_SUBCATEGORIES } from "@/lib/constants/ub-conjugation-subcategories";
import type { ALL_CATEGORIES_QUERYResult } from "@/sanity.types";

interface CategoryProduct {
  name: string | null;
  slug: string | null;
  subcategorySlug?: string | null;
}

interface ProductFiltersProps {
  categories: ALL_CATEGORIES_QUERYResult;
  categoryProducts?: CategoryProduct[];
  basePath?: string;
  hideCategorySelect?: boolean;
  lockedCategorySlug?: string;
  largeTypography?: boolean;
}

const PROTEASOME_PRODUCT_ORDER: Record<string, string[]> = {
  "substrates": [
    "Ac-Ala-Asn-Trp-AMC (ANW-AMC)",
    "Ac-Pro-Ala-Leu-AMC (PAL-AMC)",
    "Ac-Trp-Leu-Ala-AMC (WLA-AMC)",
    "Suc-Leu-Leu-Val-Tyr-AMC (LLVY-AMC)",
    "Z-Leu-Leu-Glu-AMC (Z-LLE-AMC)",
  ],
  "20s-proteasome": [
    "20S Proteasome (Rat RBC)",
    "20S Proteasome (Mouse RBC)",
    "20S Proteasome (Human RBC)",
    "20S Proteasome Kit (Human RBC)",
  ],
  "26s-proteasome": ["26S Proteasome (Human HEK293) (untagged)"],
  "20s-immunoproteasomes": [
    "20S Immunoproteasome (Human Spleen)",
    "20S Immunoproteasome (Rat Spleen)",
    "20S Immunoproteasome (Mouse Spleen)",
    "20S Immunoproteasome (Human PBMC)",
  ],
  "proteasome-kits": [
    "20S Proteasome Kit (Human RBC)",
    "20S Immunoproteasome Kit (Human PBMC)",
  ],
};

function normalizeLabel(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\(untagged\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getProteasomeOrderIndex(subcategorySlug: string, productName?: string | null) {
  const orderedNames = PROTEASOME_PRODUCT_ORDER[subcategorySlug] ?? [];
  const normalizedProductName = normalizeLabel(productName);

  const exactIndex = orderedNames.findIndex(
    (name) => normalizeLabel(name) === normalizedProductName,
  );

  if (exactIndex !== -1) {
    return exactIndex;
  }

  const fuzzyIndex = orderedNames.findIndex((name) => {
    const normalizedTarget = normalizeLabel(name);
    return (
      normalizedProductName.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedProductName)
    );
  });

  return fuzzyIndex !== -1 ? fuzzyIndex : Number.MAX_SAFE_INTEGER;
}

function isProteasomeFallbackMatch(
  subcategorySlug: string,
  product: CategoryProduct,
) {
  const name = (product.name ?? "").toLowerCase();
  const slug = (product.slug ?? "").toLowerCase();

  if (subcategorySlug === "26s-proteasome") {
    return (
      name.includes("26s proteasome") ||
      name.includes("26 proteasome") ||
      slug.includes("26s-proteasome")
    );
  }

  if (subcategorySlug === "20s-immunoproteasomes") {
    return name.includes("20s immunoproteasome") && !name.includes("kit");
  }

  if (subcategorySlug === "proteasome-kits") {
    return name.includes("proteasome kit") || name.includes("immunoproteasome kit");
  }

  if (subcategorySlug === "20s-proteasome") {
    return (
      (name.includes("20s proteasome") && !name.includes("immunoproteasome")) ||
      name.includes("20s proteasome kit")
    );
  }

  if (subcategorySlug === "substrates") {
    return (
      name.includes("anw-amc") ||
      name.includes("pal-amc") ||
      name.includes("wla-amc") ||
      name.includes("llvy-amc") ||
      name.includes("z-lle-amc") ||
      name.includes("ac-ala-asn-trp-amc") ||
      name.includes("ac-pro-ala-leu-amc") ||
      name.includes("ac-trp-leu-ala-amc") ||
      name.includes("suc-leu-leu-val-tyr-amc") ||
      name.includes("z-leu-leu-glu-amc")
    );
  }

  return false;
}

export function ProductFilters({
  categories,
  categoryProducts,
  basePath = "/",
  hideCategorySelect = false,
  lockedCategorySlug,
  largeTypography = false,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectsReady, setSelectsReady] = useState(false);

  const currentSearch = searchParams.get("q") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentSubcategory = searchParams.get("subcategory") ?? "";
  const currentColor = searchParams.get("color") ?? "";
  const currentMaterial = searchParams.get("material") ?? "";
  const currentSort = searchParams.get("sort") ?? "name";
  const urlMinPrice = Number(searchParams.get("minPrice")) || 0;
  const urlMaxPrice = Number(searchParams.get("maxPrice")) || 5000;
  const currentInStock = searchParams.get("inStock") === "true";

  // Local state for price range (for smooth slider dragging)
  const [priceRange, setPriceRange] = useState<[number, number]>([
    urlMinPrice,
    urlMaxPrice,
  ]);

  // Sync local state when URL changes
  useEffect(() => {
    setPriceRange([urlMinPrice, urlMaxPrice]);
  }, [urlMinPrice, urlMaxPrice]);

  useEffect(() => {
    setSelectsReady(true);
  }, []);

  // Check which filters are active
  const isSearchActive = !!currentSearch;
  const isCategoryActive = !!currentCategory;
  const isSubcategoryActive = !!currentSubcategory;
  const isColorActive = !!currentColor;
  const isMaterialActive = !!currentMaterial;
  const isPriceActive = urlMinPrice > 0 || urlMaxPrice < 5000;
  const isInStockActive = currentInStock;

  const hasActiveFilters =
    isSearchActive ||
    isCategoryActive ||
    isSubcategoryActive ||
    isColorActive ||
    isMaterialActive ||
    isPriceActive ||
    isInStockActive;

  // Count active filters
  const activeFilterCount = [
    isSearchActive,
    !hideCategorySelect && isCategoryActive,
    isSubcategoryActive,
    isColorActive,
    isMaterialActive,
    isPriceActive,
    isInStockActive,
  ].filter(Boolean).length;

  const updateParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === 0) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      const nextQuery = params.toString();
      router.push(nextQuery ? `${basePath}?${nextQuery}` : basePath, {
        scroll: false,
      });
    },
    [basePath, router, searchParams],
  );

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchQuery = formData.get("search") as string;
    updateParams({ q: searchQuery || null });
  };

  const handleClearFilters = () => {
    router.push(basePath, { scroll: false });
  };

  const clearSingleFilter = (key: string) => {
    if (key === "price") {
      updateParams({ minPrice: null, maxPrice: null });
    } else {
      updateParams({ [key]: null });
    }
  };

  const shopByCategories = hideCategorySelect
    ? categories.filter((category) => category.slug === lockedCategorySlug)
    : categories;

  const navigateToCategoryPage = (categorySlug?: string | null) => {
    if (!categorySlug) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("subcategory");

    const nextQuery = params.toString();
    router.push(
      nextQuery
        ? `/category/${categorySlug}?${nextQuery}`
        : `/category/${categorySlug}`,
      {
        scroll: false,
      },
    );
  };

  const handleSubcategoryFilter = (
    categorySlug: string | null | undefined,
    subcategorySlug: string | null | undefined,
  ) => {
    if (!subcategorySlug) return;

    if (currentSubcategory === subcategorySlug) {
      updateParams({ subcategory: null });
      return;
    }

    if (hideCategorySelect) {
      updateParams({ subcategory: subcategorySlug });
      return;
    }

    updateParams({
      category: categorySlug ?? null,
      subcategory: subcategorySlug,
    });
  };

  const getCurrentCategoryLabel = () => {
    if (!currentCategory) {
      return "All Categories";
    }

    return (
      categories.find((category) => category.slug === currentCategory)?.title ??
      "All Categories"
    );
  };

  const getCurrentSortLabel = () => {
    return (
      SORT_OPTIONS.find((option) => option.value === currentSort)?.label ??
      "Sort By"
    );
  };

  // Helper for filter label with active indicator
  const FilterLabel = ({
    children,
    isActive,
    filterKey,
    onClear,
  }: {
    children: React.ReactNode;
    isActive: boolean;
    filterKey?: string;
    onClear?: () => void;
  }) => (
    <div className="mb-2 flex items-center justify-between">
      <span
        className={`block ${largeTypography ? "text-base" : "text-sm"} font-medium ${
          isActive
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {children}
        {isActive && (
          <Badge className="ml-2 h-5 bg-teal-500 px-1.5 text-xs text-white hover:bg-teal-500">
            Active
          </Badge>
        )}
      </span>
      {isActive && (onClear || filterKey) && (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : clearSingleFilter(filterKey ?? ""))}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          aria-label="Clear filter"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${
        largeTypography ? "space-y-7 p-7" : "space-y-6 p-6"
      }`}
    >
      {/* Clear Filters - Show at top when active */}
      {hasActiveFilters && (
        <div className="rounded-lg border-2 border-teal-300 bg-teal-50 p-3 dark:border-teal-700 dark:bg-teal-950">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
              {activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"} applied
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleClearFilters}
            className="w-full bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            <X className="mr-2 h-4 w-4" />
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Search */}
      <div>
        <FilterLabel isActive={isSearchActive} filterKey="q">
          Search
        </FilterLabel>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <Input
            name="search"
            placeholder="Search products..."
            defaultValue={currentSearch}
            className={`flex-1 ${largeTypography ? "h-11 text-base" : ""} ${
              isSearchActive
                ? "border-teal-500 ring-1 ring-teal-500 dark:border-teal-400 dark:ring-teal-400"
                : ""
            }`}
          />
          <Button type="submit" size={largeTypography ? "default" : "sm"}>
            Search
          </Button>
        </form>
      </div>

      {/* Shop By */}
      <div>
        <FilterLabel
          isActive={isCategoryActive || isSubcategoryActive}
          onClear={() => updateParams({ category: null, subcategory: null })}
        >
          Shop By
        </FilterLabel>
        <div className="space-y-3">
          {shopByCategories.map((category) => {
            const categoryIsCurrentPage = category.slug === lockedCategorySlug;
            const categorySubcategories =
              category.slug === "ub-conjugation"
                ? UB_CONJUGATION_SUBCATEGORIES
                : category.slug === "chains"
                  ? CHAINS_SUBCATEGORIES
                  : category.slug === "proteasome"
                    ? sortProteasomeSubcategories(category.subcategories ?? [])
                  : (category.subcategories ?? []);

            return (
              <div key={category._id} className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => navigateToCategoryPage(category.slug)}
                  className={`w-full rounded-md px-2 ${largeTypography ? "py-1.5 text-base" : "py-1 text-sm"} text-left font-semibold transition-colors ${
                    categoryIsCurrentPage
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }`}
                >
                  {category.title}
                </button>

                {categorySubcategories.length > 0 && (
                  <div className={`pl-3 ${largeTypography ? "space-y-1.5" : "space-y-1"}`}>
                    {categorySubcategories.map((subcategory) => {
                      const subcategoryIsActive =
                        currentSubcategory === subcategory.slug;
                      const subcategoryProducts = categoryProducts
                        ? categoryProducts
                            .filter(
                              (p) =>
                                p.subcategorySlug === subcategory.slug ||
                                (lockedCategorySlug === "proteasome" &&
                                  isProteasomeFallbackMatch(
                                    subcategory.slug ?? "",
                                    p,
                                  )),
                            )
                            .sort((a, b) => {
                              if (lockedCategorySlug !== "proteasome") {
                                return (a.name ?? "").localeCompare(b.name ?? "");
                              }

                              const aIndex = getProteasomeOrderIndex(
                                subcategory.slug ?? "",
                                a.name,
                              );
                              const bIndex = getProteasomeOrderIndex(
                                subcategory.slug ?? "",
                                b.name,
                              );

                              if (aIndex !== bIndex) {
                                return aIndex - bIndex;
                              }

                              return (a.name ?? "").localeCompare(b.name ?? "");
                            })
                        : [];

                      return (
                        <div
                          key={subcategory._id}
                          className={largeTypography ? "space-y-1" : "space-y-0.5"}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleSubcategoryFilter(
                                category.slug,
                                subcategory.slug,
                              )
                            }
                            className={`w-full rounded-md px-2 ${largeTypography ? "py-1.5 text-[15px]" : "py-1 text-sm"} text-left transition-colors ${
                              subcategoryIsActive
                                ? "bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-100"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            }`}
                          >
                            {subcategory.name}
                          </button>

                          {subcategoryProducts.length > 0 && (
                            <div
                              className={`pl-3 ${
                                largeTypography ? "space-y-1" : "space-y-0.5"
                              }`}
                            >
                              {subcategoryProducts.map((product) => (
                                <Link
                                  key={product.slug ?? product.name}
                                  href={`/products/${product.slug ?? ""}`}
                                  className={`block w-full rounded-md px-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${
                                    largeTypography
                                      ? "py-2 text-sm leading-5 whitespace-normal"
                                      : "truncate py-1 text-xs"
                                  }`}
                                >
                                  {product.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category */}
      {!hideCategorySelect && (
        <div>
          <FilterLabel isActive={isCategoryActive} filterKey="category">
            Category
          </FilterLabel>
          {selectsReady ? (
            <Select
              value={currentCategory || "all"}
              onValueChange={(value) =>
                updateParams({ category: value === "all" ? null : value })
              }
            >
              <SelectTrigger
                className={
                  isCategoryActive
                    ? "border-teal-500 ring-1 ring-teal-500 dark:border-teal-400 dark:ring-teal-400"
                    : ""
                }
              >
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category.slug ?? ""}>
                    {category.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div
              className={`flex h-9 w-full items-center rounded-md border bg-transparent px-3 text-sm text-zinc-700 shadow-xs dark:bg-input/30 dark:text-zinc-300 ${
                isCategoryActive
                  ? "border-teal-500 ring-1 ring-teal-500 dark:border-teal-400 dark:ring-teal-400"
                  : "border-input"
              }`}
            >
              {getCurrentCategoryLabel()}
            </div>
          )}
        </div>
      )}

      {/* Color */}
      {/* <div>
        <FilterLabel isActive={isColorActive} filterKey="color">
          Color
        </FilterLabel>
        <Select
          value={currentColor || "all"}
          onValueChange={(value) =>
            updateParams({ color: value === "all" ? null : value })
          }
        >
          <SelectTrigger
            className={
              isColorActive
                ? "border-teal-500 ring-1 ring-teal-500 dark:border-teal-400 dark:ring-teal-400"
                : ""
            }
          >
            <SelectValue placeholder="All Colors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            {COLORS.map((color) => (
              <SelectItem key={color.value} value={color.value}>
                {color.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div> */}

      {/* Material */}
      {/* <div>
        <FilterLabel isActive={isMaterialActive} filterKey="material">
          Material
        </FilterLabel>
        <Select
          value={currentMaterial || "all"}
          onValueChange={(value) =>
            updateParams({ material: value === "all" ? null : value })
          }
        >
          <SelectTrigger
            className={
              isMaterialActive
                ? "border-teal-500 ring-1 ring-teal-500 dark:border-teal-400 dark:ring-teal-400"
                : ""
            }
          >
            <SelectValue placeholder="All Materials" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {MATERIALS.map((material) => (
              <SelectItem key={material.value} value={material.value}>
                {material.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div> */}

      {/* Price Range */}
      {/* <div>
        <FilterLabel isActive={isPriceActive} filterKey="price">
          Price Range: £{priceRange[0]} - £{priceRange[1]}
        </FilterLabel>
        <Slider
          min={0}
          max={5000}
          step={100}
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          onValueCommit={([min, max]) =>
            updateParams({
              minPrice: min > 0 ? min : null,
              maxPrice: max < 5000 ? max : null,
            })
          }
          className={`mt-4 ${isPriceActive ? "[&_[role=slider]]:border-teal-500 [&_[role=slider]]:ring-teal-500" : ""}`}
        />
      </div> */}

      {/* In Stock Only */}
      <div>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={currentInStock}
            onChange={(e) =>
              updateParams({ inStock: e.target.checked ? "true" : null })
            }
            className="h-5 w-5 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
          />
          <span
            className={`${largeTypography ? "text-base" : "text-sm"} font-medium ${
              isInStockActive
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-700 dark:text-zinc-300"
            }`}
          >
            Show only in-stock
            {isInStockActive && (
              <Badge className="ml-2 h-5 bg-amber-500 px-1.5 text-xs text-white hover:bg-amber-500">
                Active
              </Badge>
            )}
          </span>
        </label>
      </div>

      {/* Sort */}
      <div>
        <span
          className={`mb-2 block ${largeTypography ? "text-base" : "text-sm"} font-medium text-zinc-700 dark:text-zinc-300`}
        >
          Sort By
        </span>
        {selectsReady ? (
          <Select
            value={currentSort}
            onValueChange={(value) => updateParams({ sort: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="border-input flex h-9 w-full items-center rounded-md border bg-transparent px-3 text-sm text-zinc-700 shadow-xs dark:bg-input/30 dark:text-zinc-300">
            {getCurrentSortLabel()}
          </div>
        )}
      </div>
    </div>
  );
}
