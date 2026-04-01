"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { AskAISimilarButton } from "@/components/app/AskAISimilarButton";
import { StockBadge } from "@/components/app/StockBadge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFormattedPrice } from "@/lib/hooks/useFormattedPrice";
import { useCartActions } from "@/lib/store/cart-store-provider";
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
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const imageUrl = product.images?.[0]?.asset?.url;
  const certificateUrl = product.certificateOfAnalysisUrl?.trim();
  const quantity = product.quantity ?? "—";
  const molecularWeight = product.molecularWeight ?? "—";
  const purity = product.purity ?? "—";
  const storageBuffer = product.storageBuffer ?? "—";
  const storage = product.storage ?? "—";
  const { meta: descriptionMeta, summary: descriptionSummary } =
    splitProductDescription(product.description, product.quantity);
  const unitPrice = product.price ?? 0;
  const isBulkDiscountActive = selectedQuantity >= BULK_MIN_QUANTITY;
  const discountedUnitPrice = isBulkDiscountActive
    ? unitPrice * (1 - BULK_DISCOUNT_RATE)
    : unitPrice;
  const calculatedTotal = discountedUnitPrice * selectedQuantity;
  const savingsAmount = (unitPrice - discountedUnitPrice) * selectedQuantity;

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
      },
      selectedQuantity,
    );

    toast.success(`Added ${selectedQuantity} x ${product.name ?? "product"}`);
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
        {formatPrice(product.price)}
      </p>

      {/* Description */}
      <div className="mt-4 space-y-2">
        {descriptionMeta && (
          <p className="font-medium text-zinc-700 dark:text-zinc-300">
            {descriptionMeta}
          </p>
        )}
        <p className="text-zinc-600 dark:text-zinc-400">{descriptionSummary}</p>
      </div>

      {/* Stock & Add to Cart */}
      <div className="mt-6 flex flex-col gap-3">
        <StockBadge productId={product._id} stock={stock} />

        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Quantity
              </p>
              <div className="mt-1 flex items-center gap-2">
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

                {isBulkDiscountActive && (
                  <span className="inline-flex h-8 items-center rounded-full bg-emerald-100 px-3 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    15% OFF Applied
                  </span>
                )}
              </div>
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
            {stock <= 0 ? "Out of Stock" : `Add ${selectedQuantity} to Cart`}
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

      <Collapsible className="mt-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
          <span>View Certificate of Analysis</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-zinc-200 p-4 dark:border-zinc-800">
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
        </CollapsibleContent>
      </Collapsible>

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
