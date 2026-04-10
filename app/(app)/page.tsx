import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { HandHeart, ShieldCheck, Truck } from "lucide-react";
import { sanityFetch } from "@/sanity/lib/live";
import {
  FEATURED_PRODUCTS_QUERY,
  FILTER_PRODUCTS_BY_NAME_QUERY,
  FILTER_PRODUCTS_BY_PRICE_ASC_QUERY,
  FILTER_PRODUCTS_BY_PRICE_DESC_QUERY,
  FILTER_PRODUCTS_BY_RELEVANCE_QUERY,
} from "@/lib/sanity/queries/products";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries/categories";
import { ProductSection } from "@/components/app/ProductSection";
import { CategoryTiles } from "@/components/app/CategoryTiles";
import { FeaturedCarousel } from "@/components/app/FeaturedCarousel";
import { FeaturedCarouselSkeleton } from "@/components/app/FeaturedCarouselSkeleton";
import { NewsInlineCarousel } from "@/components/news/NewsInlineCarousel";
import { newsItems } from "@/data/news";
import {
  DEFAULT_SITE_DESCRIPTION,
  getRobotsValue,
  isProteasomeSeoExperiment,
  SITE_NAME,
} from "@/lib/site";
import { normalizeSlug } from "@/lib/utils";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: DEFAULT_SITE_DESCRIPTION,
  robots: getRobotsValue(!isProteasomeSeoExperiment()),
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

export default async function HomePage({ searchParams }: PageProps) {
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

  // Select query based on sort parameter
  const getQuery = () => {
    // If searching and sort is relevance, use relevance query
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

  // Fetch products with filters (server-side via GROQ)
  const { data: products } = await sanityFetch({
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
  });

  // Guard against duplicate documents with the same logical slug.
  const dedupedProducts: (typeof products)[number][] = Array.from(
    products
      .slice()
      .sort((a: (typeof products)[number], b: (typeof products)[number]) => {
        const score = (p: (typeof products)[number]) => {
          const hasImagesArray = (p.images?.length ?? 0) > 0 ? 2 : 0;
          return hasImagesArray;
        };

        return score(b) - score(a);
      })
      .reduce(
        (acc: Map<string, (typeof products)[number]>, product: (typeof products)[number]) => {
          const slugKey = normalizeSlug(product.slug);
          if (!slugKey) {
            acc.set(product._id, product);
            return acc;
          }

          if (!acc.has(slugKey)) {
            acc.set(slugKey, product);
          }

          return acc;
        },
        new Map<string, (typeof products)[number]>() as Map<string, (typeof products)[number]>,
      )
      .values(),
  );

  // Fetch categories for filter sidebar
  const { data: categories } = await sanityFetch({
    query: ALL_CATEGORIES_QUERY,
  });

  // Fetch featured products for carousel
  const { data: featuredProducts } = await sanityFetch({
    query: FEATURED_PRODUCTS_QUERY,
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Featured Products Carousel */}
      {featuredProducts.length > 0 && (
        <Suspense fallback={<FeaturedCarouselSkeleton />}>
          <FeaturedCarousel products={featuredProducts} />
        </Suspense>
      )}

      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 xl:grid-cols-3 xl:gap-8">
            <div className="py-2 sm:py-4">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-2xl lg:text-4xl">
                <span className="block">We Provide You</span>
                <span className="mt-2 block text-blue-600 dark:text-blue-400">
                  Custom Biochemical
                </span>
                <span className="mt-2 block">Solutions</span>
              </h2>

              <p className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">
                Assay development, protein labeling and antibody conjugation,
                expression, and purification.
              </p>

              <p className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">
                Providing you with unmatched quality, innovation, and a touch of
                genius.
              </p>

              <div className="mt-10">
                <Link
                  href="/services"
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-400 to-blue-600 px-8 py-3 text-lg font-medium text-white shadow-lg transition-all hover:from-sky-500 hover:to-blue-700 hover:shadow-xl sm:px-9 sm:py-4 sm:text-2xl"
                >
                  Custom Order
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-8 py-2 sm:py-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-4xl">
                    11
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 sm:text-lg">
                    Distributors
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-4xl">
                    100+
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 sm:text-lg">
                    Products
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-4xl">
                    250k+
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 sm:text-lg">
                    Orders
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <article className="flex items-start gap-4 rounded-3xl bg-zinc-50 p-4 shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900/50 dark:ring-zinc-800">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
                      Direct Shipping to Europe
                    </h3>
                    <p className="mt-2 text-base leading-6 text-zinc-600 dark:text-zinc-300">
                      For orders over $1,000, 50% off overseas shipments.
                    </p>
                  </div>
                </article>

                <article className="flex items-start gap-4 rounded-3xl bg-zinc-50 p-4 shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900/50 dark:ring-zinc-800">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
                      Secure Payment
                    </h3>
                    <p className="mt-2 text-base leading-6 text-zinc-600 dark:text-zinc-300">
                      Experience worry-free transactions with our secure payment
                      options.
                    </p>
                  </div>
                </article>

                <article className="flex items-start gap-4 rounded-3xl bg-zinc-50 p-4 shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-900/50 dark:ring-zinc-800">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md">
                    <HandHeart className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
                      Love to help you
                    </h3>
                    <p className="mt-2 text-base leading-6 text-zinc-600 dark:text-zinc-300">
                      Our dedicated team is here to assist you every step of
                      the way.
                    </p>
                  </div>
                </article>
              </div>
            </div>

            <div className="py-2 sm:py-4">
              <NewsInlineCarousel items={newsItems} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-linear-to-br from-white via-rose-50 to-pink-100 dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
                Technology
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-4xl lg:text-5xl">
                The platform behind our biochemical development work.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">
                Our technology capabilities sit at the center of how we design,
                validate, and deliver advanced reagents for protein science,
                ubiquitin biology, and assay development.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">
                This framework is key to how we think about discovery,
                translational workflows, and high-confidence product design.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/services"
                  className="inline-flex items-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Explore Technology Services
                </Link>
              </div>
            </div>

            <div className="relative pt-5">
              <div className="absolute left-3 top-0 z-10">
                <p className="inline-flex items-center rounded-full bg-white/85 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_10px_rgba(190,24,93,0.12)] dark:bg-zinc-800 dark:text-rose-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.35)]">
                  10 Hallmarks of Cancer
                </p>
              </div>
              <div className="relative aspect-[5/4] w-full rounded-[2rem] bg-linear-to-br from-white/40 via-rose-200/30 to-pink-200/30 p-2 shadow-[inset_8px_8px_18px_rgba(255,255,255,0.75),inset_-10px_-10px_20px_rgba(190,24,93,0.1),14px_14px_28px_rgba(190,24,93,0.14),-10px_-10px_20px_rgba(255,255,255,0.95)] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 dark:shadow-[inset_6px_6px_14px_rgba(255,255,255,0.05),inset_-8px_-8px_16px_rgba(0,0,0,0.35),12px_12px_24px_rgba(0,0,0,0.45),-10px_-10px_20px_rgba(255,255,255,0.02)]">
                <div className="absolute inset-2 rounded-[1.5rem] bg-linear-to-br from-white/25 via-rose-100/20 to-pink-100/20 dark:from-zinc-800/20 dark:via-zinc-900/20 dark:to-zinc-950/20" />
                <Image
                  src="/10HallmarksofC.jpeg"
                  alt="The 10 Hallmarks of Cancer scientific diagram"
                  fill
                  priority
                  className="object-contain scale-[1.08] drop-shadow-[0_14px_22px_rgba(164,19,60,0.22)] dark:drop-shadow-[0_14px_24px_rgba(0,0,0,0.45)]"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Page Banner */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg:zinc-950">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {categorySlug 
              ? `Shop by Category: ${categories.find((c: { slug?: string | null; title?: string | null }) => c.slug === categorySlug)?.title?.toUpperCase() || categorySlug.toUpperCase()}`
              : "Shop All Products"
            }
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Premium bioproducts for your advanced research.
          </p>
        </div>

        {/* Category Tiles - Full width */}
        <div className="mt-6">
          <CategoryTiles
            categories={categories}
            activeCategory={categorySlug || undefined}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductSection
          categories={categories}
          products={dedupedProducts}
          searchQuery={searchQuery}
          enableScrollableProductPane
        />
      </div>

      <section className="border-t border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-5xl">
                Sign Up for <span className="text-blue-600">Updates</span>
                <br />
                &amp; Newsletter
              </h2>
            </div>

            <form className="w-full" action="#" method="post">
              <div className="flex w-full flex-col gap-3 rounded-full border border-zinc-300 bg-white p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:flex-row sm:items-center">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  name="email"
                  placeholder="subscribe@south-bay-bio.com"
                  className="h-12 w-full rounded-full bg-zinc-100 px-5 text-base text-zinc-800 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                />
                <button
                  type="submit"
                  className="h-12 shrink-0 rounded-full bg-blue-600 px-8 text-lg font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

    </div>
  );
}
