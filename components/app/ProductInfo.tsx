"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AddToCartButton } from "@/components/app/AddToCartButton";
import { AskAISimilarButton } from "@/components/app/AskAISimilarButton";
import { StockBadge } from "@/components/app/StockBadge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFormattedPrice } from "@/lib/hooks/useFormattedPrice";
import type { PRODUCT_BY_SLUG_QUERYResult } from "@/sanity.types";

interface ProductInfoProps {
  product: NonNullable<PRODUCT_BY_SLUG_QUERYResult>;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const formatPrice = useFormattedPrice();
  const imageUrl = product.images?.[0]?.asset?.url;
  const certificateUrl = product.certificateOfAnalysisUrl?.trim();
  const quantity = product.quantity ?? "—";
  const molecularWeight = product.molecularWeight ?? "—";
  const purity = product.purity ?? "—";
  const storageBuffer = product.storageBuffer ?? "—";
  const storage = product.storage ?? "—";

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
      {product.description && (
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          {product.description}
        </p>
      )}

      {/* Stock & Add to Cart */}
      <div className="mt-6 flex flex-col gap-3">
        <StockBadge productId={product._id} stock={product.stock ?? 0} />
        <AddToCartButton
          productId={product._id}
          name={product.name ?? "Unknown Product"}
          price={product.price ?? 0}
          image={imageUrl ?? undefined}
          stock={product.stock ?? 0}
        />
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
