import Image from "next/image";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { AddToCartButton } from "@/components/app/AddToCartButton";
import { EmptyState } from "@/components/ui/empty-state";
import { useFormattedPrice } from "@/lib/hooks/useFormattedPrice";
import { splitProductDescription } from "@/lib/utils/product-description";
import { normalizeSlug } from "@/lib/utils";
import type { FILTER_PRODUCTS_BY_NAME_QUERYResult } from "@/sanity.types";

type Product = FILTER_PRODUCTS_BY_NAME_QUERYResult[number];

interface CategoryProductListProps {
  products: FILTER_PRODUCTS_BY_NAME_QUERYResult;
}

export function CategoryProductList({ products }: CategoryProductListProps) {
  const formatPrice = useFormattedPrice();

  if (products.length === 0) {
    return (
      <div className="min-h-[400px] rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <EmptyState
          icon={PackageSearch}
          title="No products found"
          description="Try adjusting your search or filters to find what you're looking for"
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {products.map((product) => {
        const imageUrl = product.images?.[0]?.asset?.url;
        const stock = product.stock ?? 0;
        const { meta, summary } = splitProductDescription(
          product.description,
          product.quantity,
        );

        return (
          <article
            key={product._id}
            className="grid gap-6 border-b border-zinc-200 pb-8 last:border-b-0 dark:border-zinc-800 lg:grid-cols-[minmax(220px,280px)_1fr]"
          >
            <Link
              href={`/products/${normalizeSlug(product.slug)}`}
              className="group block overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-900"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                {imageUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <Image
                      src={imageUrl}
                      alt={product.name ?? "Product image"}
                      width={1200}
                      height={1200}
                      className="h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 1024px) 100vw, 280px"
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-400">
                    <svg
                      className="h-20 w-20 opacity-30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </Link>

            <div className="flex flex-col justify-center gap-5 lg:gap-6">
              <div className="space-y-2">
                <Link href={`/products/${normalizeSlug(product.slug)}`} className="block">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-950 transition-colors hover:text-sky-700 dark:text-zinc-100 dark:hover:text-sky-300 sm:text-2xl">
                    {product.name}
                  </h2>
                </Link>
                <p className="text-2xl font-light tracking-tight text-sky-600 dark:text-sky-400 sm:text-3xl">
                  {formatPrice(product.price)}
                </p>
              </div>

              <div className="max-w-[190px]">
                <AddToCartButton
                  productId={product._id}
                  name={product.name ?? "Unknown Product"}
                  price={product.price ?? 0}
                  image={imageUrl ?? undefined}
                  stock={stock}
                  className="h-9 text-xs"
                />
              </div>

              {meta && <p className="text-sm leading-7 text-zinc-800 dark:text-zinc-200">{meta}</p>}

              <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                {summary}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
