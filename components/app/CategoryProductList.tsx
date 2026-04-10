import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { AddToCartButton } from "@/components/app/AddToCartButton";
import { EmptyState } from "@/components/ui/empty-state";
import { useFormattedPrice } from "@/lib/hooks/useFormattedPrice";
import {
  getProductSizeVariants,
  type ProductSizeVariantOption,
} from "@/lib/constants/products-with-size-variants";
import { splitProductDescription } from "@/lib/utils/product-description";
import { normalizeSlug } from "@/lib/utils";
import type { FILTER_PRODUCTS_BY_NAME_QUERYResult } from "@/sanity.types";

type Product = FILTER_PRODUCTS_BY_NAME_QUERYResult[number];
type ProductWithLegacyImageFields = Product & {
  image?: { asset?: { url?: string | null } | null } | null;
  imageUrl?: string | null;
  imageUrls?: Array<string | null> | null;
};

interface CategoryProductListProps {
  products: FILTER_PRODUCTS_BY_NAME_QUERYResult;
}

function CategoryProductRow({ product }: { product: Product }) {
  const formatPrice = useFormattedPrice();
  const productWithFallback = product as ProductWithLegacyImageFields;
  const imageUrl =
    productWithFallback.images?.[0]?.asset?.url ??
    productWithFallback.image?.asset?.url ??
    productWithFallback.imageUrl ??
    productWithFallback.imageUrls?.[0] ??
    undefined;
  const stock = product.stock ?? 0;
  const sizeVariants = getProductSizeVariants(product.name);
  const pricedVariants = sizeVariants.filter(
    (variant): variant is ProductSizeVariantOption & { price: number } =>
      typeof variant.price === "number",
  );
  const [selectedSize, setSelectedSize] = useState(sizeVariants[0]?.label ?? "");
  const selectedVariant =
    pricedVariants.find((variant) => variant.label === selectedSize) ??
    pricedVariants[0] ??
    null;
  const displayPrice = selectedVariant?.price ?? product.price ?? 0;
  const { meta, summary } = splitProductDescription(
    product.description,
    product.quantity,
  );
  const displayMeta = meta && selectedVariant
    ? meta.replace(
        /(Catalog\s+[Nn]umber:[^,]*,\s*)(\d+(?:\.\d+)?\s*[μµ]g)/,
        `$1${selectedVariant.label}`,
      )
    : meta;

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

      <div className="flex flex-col justify-center gap-3 lg:gap-4">
        <div className="space-y-2">
          <Link href={`/products/${normalizeSlug(product.slug)}`} className="block">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950 transition-colors hover:text-sky-700 dark:text-zinc-100 dark:hover:text-sky-300 sm:text-xl">
              {product.name}
            </h2>
          </Link>

          {sizeVariants.length > 0 && (
            <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
              {sizeVariants.map((sizeOption) => (
                <button
                  key={sizeOption.label}
                  type="button"
                  onClick={() => setSelectedSize(sizeOption.label)}
                  className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                    selectedSize === sizeOption.label
                      ? "bg-teal-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {sizeOption.label}
                </button>
              ))}
            </div>
          )}

          <p className="text-xl font-light tracking-tight text-sky-600 dark:text-sky-400 sm:text-2xl">
            {formatPrice(displayPrice)}
          </p>
        </div>

        <div className="max-w-[190px]">
          <AddToCartButton
            productId={product._id}
            name={product.name ?? "Unknown Product"}
            price={displayPrice}
            image={imageUrl ?? undefined}
            stock={stock}
            size={selectedVariant?.label}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          {displayMeta && (
            <p className="text-sm font-semibold leading-5 text-zinc-800 dark:text-zinc-200">
              {displayMeta}
            </p>
          )}

          <p className="max-w-3xl whitespace-pre-line text-sm leading-5 text-zinc-700 dark:text-zinc-300">
            {summary}
          </p>
        </div>
      </div>
    </article>
  );
}

export function CategoryProductList({ products }: CategoryProductListProps) {
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
      {products.map((product) => <CategoryProductRow key={product._id} product={product} />)}
    </div>
  );
}
