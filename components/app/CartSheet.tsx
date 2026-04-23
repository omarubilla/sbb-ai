"use client";

import { AlertTriangle, Loader2, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useCartItems,
  useCartIsOpen,
  useCartActions,
  useTotalItems,
} from "@/lib/store/cart-store-provider";
import { useCartStock } from "@/lib/hooks/useCartStock";
import { CartSummary } from "./CartSummary";
import { getCartLineId } from "@/lib/store/cart-store";
import { Button } from "@/components/ui/button";
import { useFormattedPrice } from "@/lib/hooks/useFormattedPrice";
import { useState, useEffect } from "react";

interface ProductGroup {
  productId: string;
  name: string;
  catalogNumber?: string;
  lines: Array<{
    size?: string;
    quantity: number;
    price: number;
  }>;
}

export function CartSheet() {
  const items = useCartItems();
  const isOpen = useCartIsOpen();
  const totalItems = useTotalItems();
  const { closeCart, removeItem, updateQuantity } = useCartActions();
  const { stockMap, isLoading, hasStockIssues } = useCartStock(items);
  const formatPrice = useFormattedPrice();
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set(items.map((i) => i.productId))
  );

  // Update expandedProducts when items change to ensure new products are shown expanded by default
  useEffect(() => {
    const productIds = new Set(items.map((i) => i.productId));
    setExpandedProducts((prev) => {
      // Keep existing expanded states but add any new products as expanded
      const next = new Set(prev);
      productIds.forEach((id) => next.add(id));
      return next;
    });
  }, [items]);

  // Group items by product
  const groupedItems = items.reduce<Map<string, ProductGroup>>((acc, item) => {
    if (!acc.has(item.productId)) {
      acc.set(item.productId, {
        productId: item.productId,
        name: item.name,
        catalogNumber: item.catalogNumber,
        lines: [],
      });
    }
    const group = acc.get(item.productId)!;
    group.lines.push({
      size: item.size,
      quantity: item.quantity,
      price: item.price,
    });
    return acc;
  }, new Map());

  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="flex h-dvh max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-zinc-200 dark:border-zinc-800">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart ({totalItems})
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <ShoppingBag className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Your cart is empty
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Add some items to get started
            </p>
          </div>
        ) : (
          <>
            {/* Stock Issues Banner */}
            {hasStockIssues && !isLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Some items have stock issues. Please review before checkout.
                </span>
              </div>
            )}

            {/* Cart Items - Grouped by Product */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              <div className="space-y-3 py-3">
                {Array.from(groupedItems.values()).map((group) => {
                  const isExpanded = expandedProducts.has(group.productId);
                  const productSubtotal = group.lines.reduce(
                    (sum, line) => sum + line.price * line.quantity,
                    0
                  );

                  return (
                    <div
                      key={group.productId}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                    >
                      {/* Product Header */}
                      <button
                        onClick={() => toggleProduct(group.productId)}
                        className="w-full px-3 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Link
                            href={`/products/${group.productId}`}
                            className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {group.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {formatPrice(productSubtotal)}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {isExpanded ? "−" : "+"}
                          </span>
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
                          {/* Size × Quantity Rows */}
                          <div className="p-3 space-y-2">
                            {group.lines.map((line, idx) => {
                              const item = items.find(
                                (i) =>
                                  i.productId === group.productId &&
                                  i.size === line.size
                              );
                              if (!item) return null;

                              const lineId = getCartLineId(
                                group.productId,
                                line.size
                              );
                              const lineTotal = line.price * line.quantity;

                              return (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                      {line.size || "Default"} × {line.quantity}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <span className="font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                      {formatPrice(lineTotal)}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-zinc-400 hover:text-red-500"
                                      onClick={() =>
                                        removeItem(group.productId, line.size)
                                      }
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span className="sr-only">
                                        Remove {line.size}
                                      </span>
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <CartSummary hasStockIssues={hasStockIssues} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
