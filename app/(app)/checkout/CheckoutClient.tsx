"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShoppingBag, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { BankfulCheckoutButton } from "@/components/app/BankfulCheckoutButton";
import { formatPrice } from "@/lib/utils";
import {
  useCartItems,
  useTotalPrice,
  useTotalItems,
} from "@/lib/store/cart-store-provider";
import { useCartStock } from "@/lib/hooks/useCartStock";
import { getCustomerProfile } from "@/lib/actions/customer";

interface CheckoutCustomerInfo {
  fullName: string;
  institution: string;
  address: string;
}

const DEFAULT_CUSTOMER_STORAGE_KEY = "checkout-default-customer";

export function CheckoutClient() {
  const items = useCartItems();
  const totalPrice = useTotalPrice();
  const totalItems = useTotalItems();
  const { stockMap, isLoading, hasStockIssues } = useCartStock(items);
  const { isSignedIn } = useUser();
  const [customerInfo, setCustomerInfo] = useState<CheckoutCustomerInfo>({
    fullName: "",
    institution: "",
    address: "",
  });

  // On mount: if signed in, load from Sanity; otherwise fall back to localStorage
  useEffect(() => {
    async function load() {
      if (isSignedIn) {
        try {
          const profile = await getCustomerProfile();
          if (profile) {
            setCustomerInfo({
              fullName: profile.fullName,
              institution: profile.institution,
              address: profile.address,
            });
          }
        } catch {
          // Fall back silently — user can fill manually
        }
        return;
      }

      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(DEFAULT_CUSTOMER_STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Partial<CheckoutCustomerInfo>;
        if (!parsed || typeof parsed !== "object") return;
        setCustomerInfo((current) => ({
          fullName:
            typeof parsed.fullName === "string" ? parsed.fullName : current.fullName,
          institution:
            typeof parsed.institution === "string"
              ? parsed.institution
              : current.institution,
          address: typeof parsed.address === "string" ? parsed.address : current.address,
        }));
      } catch {
        // Ignore malformed defaults; users can still enter details manually.
      }
    }
    load();
  }, [isSignedIn]);

  const hasCompleteCustomerInfo = useMemo(() => {
    return (
      customerInfo.fullName.trim().length > 0 &&
      customerInfo.institution.trim().length > 0 &&
      customerInfo.address.trim().length > 0
    );
  }, [customerInfo]);

  const handleLoadDefault = async () => {
    if (isSignedIn) {
      try {
        const profile = await getCustomerProfile();
        if (!profile) {
          toast.info("No profile found in your account yet");
          return;
        }
        setCustomerInfo({
          fullName: profile.fullName,
          institution: profile.institution,
          address: profile.address,
        });
        if (!profile.fullName || !profile.institution || !profile.address) {
          toast.warning("Profile loaded but some fields are still missing");
          return;
        }
        toast.success("Profile loaded from your account");
      } catch {
        toast.error("Could not load profile");
      }
      return;
    }

    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(DEFAULT_CUSTOMER_STORAGE_KEY);
    if (!raw) {
      toast.info("No default customer data found yet");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<CheckoutCustomerInfo>;
      const next = {
        fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
        institution:
          typeof parsed.institution === "string" ? parsed.institution : "",
        address: typeof parsed.address === "string" ? parsed.address : "",
      };
      setCustomerInfo(next);
      if (!next.fullName || !next.institution || !next.address) {
        toast.warning("Default profile loaded but some fields are still missing");
        return;
      }
      toast.success("Default customer profile loaded");
    } catch {
      toast.error("Could not load default customer data");
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <ShoppingBag className="mx-auto h-16 w-16 text-zinc-300 dark:text-zinc-600" />
          <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Your cart is empty
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Add some items to your cart before checking out.
          </p>
          <Button asChild className="mt-8">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Checkout
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Cart Items */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Order Summary ({totalItems} items)
              </h2>
            </div>

            {/* Stock Issues Warning */}
            {hasStockIssues && !isLoading && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>
                  Some items have stock issues. Please update your cart before
                  proceeding.
                </span>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                <span className="ml-2 text-sm text-zinc-500">
                  Verifying stock...
                </span>
              </div>
            )}

            {/* Items List */}
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {items.map((item) => {
                const stockInfo = stockMap.get(item.productId);
                const hasIssue =
                  stockInfo?.isOutOfStock || stockInfo?.exceedsStock;

                return (
                  <div
                    key={item.productId}
                    className={`flex gap-4 px-6 py-4 ${
                      hasIssue ? "bg-red-50 dark:bg-red-950/20" : ""
                    }`}
                  >
                    {/* Image */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Qty: {item.quantity}
                        </p>
                        {stockInfo?.isOutOfStock && (
                          <p className="mt-1 text-sm font-medium text-red-600">
                            Out of stock
                          </p>
                        )}
                        {stockInfo?.exceedsStock && !stockInfo.isOutOfStock && (
                          <p className="mt-1 text-sm font-medium text-amber-600">
                            Only {stockInfo.currentStock} available
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-sm text-zinc-500">
                          {formatPrice(item.price)} each
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Total & Checkout */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Payment Summary
            </h2>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Subtotal
                </span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Shipping
                </span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  Calculated at checkout
                </span>
              </div>
              <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-zinc-900 dark:text-zinc-100">
                    Total
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Customer Information
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadDefault}
                    className="inline-flex items-center whitespace-nowrap rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold leading-none text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60"
                  >
                    Load Default
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="checkout-full-name"
                      className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                    >
                      Name (First and Last)
                    </label>
                    <input
                      id="checkout-full-name"
                      value={customerInfo.fullName}
                      onChange={(event) =>
                        setCustomerInfo((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-400 dark:focus:ring-sky-900"
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-institution"
                      className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                    >
                      Institution / Company
                    </label>
                    <input
                      id="checkout-institution"
                      value={customerInfo.institution}
                      onChange={(event) =>
                        setCustomerInfo((current) => ({
                          ...current,
                          institution: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-400 dark:focus:ring-sky-900"
                      placeholder="South Bay Bio"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-address"
                      className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                    >
                      Shipping Address
                    </label>
                    <textarea
                      id="checkout-address"
                      value={customerInfo.address}
                      onChange={(event) =>
                        setCustomerInfo((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      className="min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-400 dark:focus:ring-sky-900"
                      placeholder="Street, City, State, Postcode, Country"
                    />
                  </div>
                </div>
              </div>

              {/* Stripe checkout temporarily disabled; keep Bankful as the only checkout path. */}
              {/* <CheckoutButton disabled={hasStockIssues || isLoading} /> */}

              <BankfulCheckoutButton
                disabled={hasStockIssues || isLoading || !hasCompleteCustomerInfo}
                customerInfo={customerInfo}
              />
            </div>

            {!hasCompleteCustomerInfo && (
              <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
                Complete customer information to continue with Bankful checkout.
              </p>
            )}

            <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
              You&apos;ll be redirected to a secure checkout page
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
