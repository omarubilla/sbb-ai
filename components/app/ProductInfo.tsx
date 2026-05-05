"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { AskAISimilarButton } from "@/components/app/AskAISimilarButton";
import { StockBadge } from "@/components/app/StockBadge";
import { Button } from "@/components/ui/button";
import { useFormattedPrice } from "@/lib/hooks/useFormattedPrice";
import { useCartActions } from "@/lib/store/cart-store-provider";
import {
  getProductSizeVariants,
  productHasSizeVariants,
} from "@/lib/constants/products-with-size-variants";
import { splitProductDescription } from "@/lib/utils/product-description";
import type { PRODUCT_BY_SLUG_QUERYResult } from "@/sanity.types";

interface ProductInfoProps {
  product: NonNullable<PRODUCT_BY_SLUG_QUERYResult>;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const BULK_MIN_QUANTITY = 10;
  const BULK_DISCOUNT_RATE = 0.15;

  const formatPrice = useFormattedPrice();
  const { addItem } = useCartActions();
  const stock = product.stock ?? 0;
  const hasSizeVariants = productHasSizeVariants(product.name);
  const sizeVariants = getProductSizeVariants(product.name);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(sizeVariants[0]?.label ?? "");
  const [isCoaOpen, setIsCoaOpen] = useState(false);
  const imageUrl = product.images?.[0]?.asset?.url;
  const certificateUrl = product.certificateOfAnalysisUrl?.trim();
  const quantity = product.quantity ?? "—";
  const molecularWeight = product.molecularWeight ?? "—";
  const purity = product.purity ?? "—";
  const storageBuffer = product.storageBuffer ?? "—";
  const storage = product.storage ?? "—";
  const { meta: descriptionMeta, summary: descriptionSummary } =
    splitProductDescription(product.description, product.quantity);
  const displayDescriptionMeta = descriptionMeta && hasSizeVariants && selectedSize
    ? descriptionMeta.replace(
      /(Catalog\s+[Nn]umber:[^,]*,\s*)(\d+(?:\.\d+)?\s*[μµ]g)/,
      `$1${selectedSize}`,
    )
    : descriptionMeta;
  const catalogNumber = descriptionMeta
    .replace(/^Catalog\s+[Nn]umber:\s*/, "")
    .trim();
  const selectedVariant = sizeVariants.find((variant) => variant.label === selectedSize);
  const baseUnitPrice = selectedVariant?.price ?? product.price ?? 0;
  const isBulkDiscountActive = selectedQuantity >= BULK_MIN_QUANTITY;
  const discountedUnitPrice = isBulkDiscountActive
    ? baseUnitPrice * (1 - BULK_DISCOUNT_RATE)
    : baseUnitPrice;
  const calculatedTotal = discountedUnitPrice * selectedQuantity;
  const savingsAmount = (baseUnitPrice - discountedUnitPrice) * selectedQuantity;
  const coaPanelId = `coa-panel-${product._id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  useEffect(() => {
    setSelectedSize(sizeVariants[0]?.label ?? "");
    setSelectedQuantity(1);
  }, [product._id, sizeVariants]);
  const handleSelectSize = (sizeLabel: string) => {
    setSelectedSize(sizeLabel);
  };


  const handleDecreaseQuantity = () => {
    setSelectedQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseQuantity = () => {
    setSelectedQuantity((prev) => Math.min(stock, prev + 1));
  };

  const handleAddSelectedToCart = () => {
    if (stock <= 0) {
      return;
    }

    addItem(
      {
        productId: product._id,
        name: product.name ?? "Unknown Product",
        price: discountedUnitPrice,
        image: imageUrl ?? undefined,
        size: hasSizeVariants ? selectedSize : undefined,
        catalogNumber,
      },
      selectedQuantity,
    );

    toast.success(
      hasSizeVariants
        ? `Added ${selectedQuantity} x ${product.name ?? "product"} (${selectedSize})`
        : `Added ${selectedQuantity} x ${product.name ?? "product"}`,
    );
  };

  return (
    <div className="flex flex-col">
      {/* Category */}
      {product.category && (
        <Link
          href={`/?category=${product.category.slug}`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {product.category.title}
        </Link>
      )}

      {/* Title */}
      <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
        {product.name}
      </h1>

      {/* Price */}
      <p className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {formatPrice(baseUnitPrice)}
      </p>

      {/* Description */}
      <div className="mt-4 space-y-2">
        {displayDescriptionMeta && (
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">
            {displayDescriptionMeta}
          </p>
        )}
        <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">{descriptionSummary}</p>
      </div>

      {/* Stock & Add to Cart */}
      <div className="mt-6 flex flex-col gap-3">
        <StockBadge productId={product._id} stock={stock} />

        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="w-full max-w-[420px]">
                <div className={`grid gap-x-8 ${hasSizeVariants ? "grid-cols-[9rem_1fr]" : "grid-cols-[9rem_1fr]"}`}>
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Quantity
                  </p>
                  {hasSizeVariants ? (
                    <p className="text-center text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Size
                    </p>
                  ) : (
                    <span />
                  )}
                </div>
                <div className={`mt-1 grid items-center gap-x-8 ${hasSizeVariants ? "grid-cols-[9rem_1fr]" : "grid-cols-[9rem_1fr]"}`}>
                  <div className="flex h-11 w-36 items-center rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-full w-11 rounded-r-none"
                      onClick={handleDecreaseQuantity}
                      disabled={selectedQuantity <= 1 || stock <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="flex-1 text-center text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {selectedQuantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-full w-11 rounded-l-none"
                      onClick={handleIncreaseQuantity}
                      disabled={selectedQuantity >= stock || stock <= 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {hasSizeVariants ? (
                    <div className="flex justify-center">
                      <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
                        {sizeVariants.map((sizeOption) => (
                          <button
                            key={sizeOption.label}
                            type="button"
                            onClick={() => handleSelectSize(sizeOption.label)}
                            className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                              selectedSize === sizeOption.label
                                ? "bg-teal-600 text-white"
                                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {sizeOption.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
              </div>

              {isBulkDiscountActive && (
                <span className="mt-2 inline-flex h-8 items-center rounded-full bg-emerald-100 px-3 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  15% OFF Applied
                </span>
              )}
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Total
              </p>
              <p className="mt-1 text-2xl font-bold text-teal-600 dark:text-teal-400">
                {formatPrice(calculatedTotal)}
              </p>
              {isBulkDiscountActive && savingsAmount > 0 && (
                <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  You save {formatPrice(savingsAmount)}
                </p>
              )}
            </div>
          </div>

          <p className="mt-3 text-sm font-semibold text-teal-600 dark:text-teal-400">
            Free Same-day Shipping on Domestic Orders over $750
          </p>

          <Button
            onClick={handleAddSelectedToCart}
            className="mt-3 h-11 w-full"
            disabled={stock <= 0}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            {stock <= 0
              ? "Out of Stock"
              : hasSizeVariants
                ? `Add ${selectedQuantity} (${selectedSize}) to Cart`
                : `Add ${selectedQuantity} to Cart`}
          </Button>
        </div>

        <AskAISimilarButton productName={product.name ?? "this product"} />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th
                scope="row"
                className="w-40 border-r border-zinc-200 px-4 py-3 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                Quantity:
              </th>
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                {quantity}
              </td>
            </tr>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th
                scope="row"
                className="w-40 border-r border-zinc-200 px-4 py-3 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                Molecular Weight:
              </th>
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                {molecularWeight}
              </td>
            </tr>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th
                scope="row"
                className="w-40 border-r border-zinc-200 px-4 py-3 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                Purity:
              </th>
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                {purity}
              </td>
            </tr>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th
                scope="row"
                className="w-40 border-r border-zinc-200 px-4 py-3 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                Storage Buffer:
              </th>
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                {storageBuffer}
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                className="w-40 border-r border-zinc-200 px-4 py-3 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
              >
                Storage
              </th>
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                {storage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          aria-expanded={isCoaOpen}
          aria-controls={coaPanelId}
          onClick={() => setIsCoaOpen((prev) => !prev)}
          className="group flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <span>View Certificate of Analysis</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isCoaOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {isCoaOpen && (
          <div
            id={coaPanelId}
            className="border-t border-zinc-200 p-4 dark:border-zinc-800"
          >
          {certificateUrl ? (
            <iframe
              src={certificateUrl}
              title={`Certificate of Analysis for ${product.name ?? "product"}`}
              className="h-[560px] w-full rounded-md border border-zinc-200 dark:border-zinc-800"
            />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Certificate of Analysis is not available for this product yet.
            </p>
          )}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-6 space-y-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {product.assemblyRequired !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Assembly</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {product.assemblyRequired ? "Required" : "Not required"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
