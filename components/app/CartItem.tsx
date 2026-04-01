"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartActions } from "@/lib/store/cart-store-provider";
import { StockBadge } from "@/components/app/StockBadge";
import { cn } from "@/lib/utils";
import { useFormattedPrice } from "@/lib/hooks/useFormattedPrice";
import type { CartItem as CartItemType } from "@/lib/store/cart-store";
import type { StockInfo } from "@/lib/hooks/useCartStock";

interface CartItemProps {
  item: CartItemType;
  stockInfo?: StockInfo;
}

export function CartItem({ item, stockInfo }: CartItemProps) {
  const { removeItem, updateQuantity } = useCartActions();
  const formatPrice = useFormattedPrice();

  const isOutOfStock = stockInfo?.isOutOfStock ?? false;
  const exceedsStock = stockInfo?.exceedsStock ?? false;
  const currentStock = stockInfo?.currentStock ?? 999;
  const hasIssue = isOutOfStock || exceedsStock;
  const lineTotal = item.price * item.quantity;

  return (
    <div
      className={cn(
        "py-4",
        hasIssue && "rounded-lg bg-red-50 p-3 dark:bg-red-950/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/products/${item.productId}`}
          className={cn(
            "font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300",
            isOutOfStock && "text-zinc-400 dark:text-zinc-500",
          )}
        >
          {item.name}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-red-500"
          onClick={() => removeItem(item.productId, item.size)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove {item.name}</span>
        </Button>
      </div>

      <div className="mt-2 grid gap-1 text-sm text-zinc-600 dark:text-zinc-300">
        <p>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Catalog #:</span>{" "}
          {item.catalogNumber || "N/A"}
        </p>
        <p>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Size:</span>{" "}
          {item.size || "Default"}
        </p>
        <p>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Unit Price:</span>{" "}
          {formatPrice(item.price)}
        </p>
        <p>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Line Total:</span>{" "}
          {formatPrice(lineTotal)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <StockBadge productId={item.productId} stock={currentStock} />

        <div className="flex h-9 w-28 items-center rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-9 rounded-r-none"
            onClick={() => updateQuantity(item.productId, item.quantity - 1, item.size)}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-center text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-9 rounded-l-none"
            onClick={() => updateQuantity(item.productId, item.quantity + 1, item.size)}
            disabled={item.quantity >= currentStock || isOutOfStock}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
