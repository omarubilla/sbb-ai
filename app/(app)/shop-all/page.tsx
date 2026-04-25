import type { Metadata } from "next";
import { sanityFetch } from "@/sanity/lib/live";
import {
  FILTER_PRODUCTS_BY_NAME_QUERY,
  FILTER_PRODUCTS_BY_PRICE_ASC_QUERY,
  FILTER_PRODUCTS_BY_PRICE_DESC_QUERY,
  FILTER_PRODUCTS_BY_RELEVANCE_QUERY,
} from "@/lib/sanity/queries/products";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { ProductSection } from "@/components/app/ProductSection";

export const metadata: Metadata = {
  title: "Shop All Products | South Bay Bio",
  description:
    "Browse all South Bay Bio products with master filters for categories, subcategories, and product families.",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    subcategory?: string;
    color?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    inStock?: string;
  }>;
}

export default async function ShopAllPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const searchQuery = params.q ?? "";
  const categorySlug = params.category ?? "";
  const subcategorySlug = params.subcategory ?? "";
  const color = params.color ?? "";
  const material = params.material ?? "";
  const minPrice = Number(params.minPrice) || 0;
  const maxPrice = Number(params.maxPrice) || 0;
  const sort = params.sort ?? "name";
  const inStock = params.inStock === "true";

  const getQuery = () => {
    if (searchQuery && sort === "relevance") {
      return FILTER_PRODUCTS_BY_RELEVANCE_QUERY;
    }

    switch (sort) {
      case "price_asc":
        return FILTER_PRODUCTS_BY_PRICE_ASC_QUERY;
      case "price_desc":
        return FILTER_PRODUCTS_BY_PRICE_DESC_QUERY;
      case "relevance":
        return FILTER_PRODUCTS_BY_RELEVANCE_QUERY;
      default:
        return FILTER_PRODUCTS_BY_NAME_QUERY;
    }
  };

  const [{ data: categories }, { data: products }, { data: allProducts }] =
    await Promise.all([
      sanityFetch({ query: ALL_CATEGORIES_QUERY }),
      sanityFetch({
        query: getQuery(),
        params: {
          searchQuery,
          categorySlug,
          subcategorySlug,
          color,
          material,
          minPrice,
          maxPrice,
          inStock,
        },
      }),
      sanityFetch({
        query: FILTER_PRODUCTS_BY_NAME_QUERY,
        params: {
          searchQuery: "",
          categorySlug: "",
          subcategorySlug: "",
          color: "",
          material: "",
          minPrice: 0,
          maxPrice: 0,
          inStock: false,
        },
      }),
    ]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Shop All Products
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-600 dark:text-zinc-300">
            Explore the full South Bay Bio catalog. Use the master left-side
            filter to navigate categories, subcategories, and product lines.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductSection
          categories={categories}
          products={products}
          allFilterProducts={allProducts}
          searchQuery={searchQuery}
          basePath="/shop-all"
          constrainFilterSidebar={false}
          largeFilterSidebar
          syncProductPaneToSidebar
        />
      </section>
    </div>
  );
}
