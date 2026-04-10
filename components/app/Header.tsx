"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Package, ShoppingBag, Sparkles, Truck, User } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useCartActions, useTotalItems } from "@/lib/store/cart-store-provider";
import { useChatActions, useIsChatOpen } from "@/lib/store/chat-store-provider";
import { CurrencyConverter } from "@/components/app/CurrencyConverter";
import type { ALL_CATEGORIES_QUERYResult } from "@/sanity.types";
import { getCategoryPageSlug } from "@/lib/constants/category-pages";
import { CHAINS_SUBCATEGORIES } from "@/lib/constants/chains-subcategories";
import { UB_CONJUGATION_SUBCATEGORIES } from "@/lib/constants/ub-conjugation-subcategories";
import sbbLogo from "@/app/SBB_Logo_full.png";

interface HeaderProps {
  categories: ALL_CATEGORIES_QUERYResult;
}

const TOP_NAV_ORDER = [
  "ub-conjugation",
  "e3-ligases",
  "ub-deconjugation",
  "c-terminal-derivatives",
  "proteasome",
  "tr-fret",
  "chains",
  "neurodegenerative-diseases",
] as const;

export function Header({ categories }: HeaderProps) {
  const { openCart } = useCartActions();
  const { openChat } = useChatActions();
  const isChatOpen = useIsChatOpen();
  const totalItems = useTotalItems();

  const orderedCategories = categories
    .map((category) => ({
      category,
      categorySlug: getCategoryPageSlug(category.title, category.slug),
    }))
    .filter((item) => Boolean(item.categorySlug))
    .sort((a, b) => {
      const aIndex = TOP_NAV_ORDER.indexOf(a.categorySlug as (typeof TOP_NAV_ORDER)[number]);
      const bIndex = TOP_NAV_ORDER.indexOf(b.categorySlug as (typeof TOP_NAV_ORDER)[number]);
      const safeAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

      if (safeAIndex !== safeBIndex) {
        return safeAIndex - safeBIndex;
      }

      return (a.category.title ?? "").localeCompare(b.category.title ?? "");
    });

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src={sbbLogo}
            alt="South Bay Bio"
            priority
            className="h-16 w-auto"
          />
        </Link>

        {/* Center Nav */}
        <div className="flex flex-1 items-center justify-center gap-1">
          <Button variant="ghost" asChild className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">
            <Link href="/">Home</Link>
          </Button>
          <Button variant="ghost" asChild className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">
            <Link href="/services">Services</Link>
          </Button>
          <Button variant="ghost" asChild className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">
            <Link href="/about">About</Link>
          </Button>
          <Button variant="ghost" asChild className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">
            <Link href="/distributors">Distributors</Link>
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* My Orders - Only when signed in */}
          <SignedIn>
            <Button asChild>
              <Link href="/orders" className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <span className="text-sm font-medium">My Orders</span>
              </Link>
            </Button>
          </SignedIn>

          {/* AI Shopping Assistant */}
          {!isChatOpen && (
            <Button
              onClick={openChat}
              className="gap-2 bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md shadow-blue-200/50 transition-all hover:from-sky-500 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-300/50 dark:shadow-blue-900/30 dark:hover:shadow-blue-800/40"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Ask AI</span>
            </Button>
          )}

          {/* Currency Converter */}
          <CurrencyConverter />

          {/* Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={openCart}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
            <span className="sr-only">Open cart ({totalItems} items)</span>
          </Button>

          {/* User */}
          <SignedIn>
            <UserButton
              afterSwitchSessionUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="My Orders"
                  labelIcon={<Package className="h-4 w-4" />}
                  href="/orders"
                />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">Sign in</span>
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <nav className="mx-auto flex h-10 max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 sm:px-6 lg:px-8 md:overflow-visible scrollbar-hide">
          {orderedCategories.map(({ category, categorySlug }) => {
            const normalizedTitle = (category.title ?? "").trim().toLowerCase();
            const fallbackSubcategories = [...(category.subcategories ?? [])].sort(
              (a, b) => (a.name ?? "").localeCompare(b.name ?? ""),
            );
            const subcategories =
              normalizedTitle === "ub conjugation" || categorySlug === "ub-conjugation"
                ? UB_CONJUGATION_SUBCATEGORIES
                : normalizedTitle === "chains" || categorySlug === "chains"
                  ? CHAINS_SUBCATEGORIES
                : fallbackSubcategories;
            const isProteasome = categorySlug === "proteasome";
            const categoryHref = isProteasome
              ? "/proteasome"
              : `/category/${categorySlug}`;

            if (subcategories.length === 0) {
              return (
                <Button
                  key={category._id}
                  variant="ghost"
                  asChild
                  className="h-7 shrink-0 bg-sky-600 px-2.5 text-sm whitespace-nowrap text-white hover:bg-sky-700 hover:text-white"
                >
                  <Link href={categoryHref}>
                    {category.title}
                  </Link>
                </Button>
              );
            }

            return (
              <div key={category._id} className="group relative shrink-0">
                <Link
                  href={categoryHref}
                  className="inline-flex h-7 items-center rounded-md bg-sky-600 px-2.5 text-sm whitespace-nowrap text-white transition-colors hover:bg-sky-700 hover:text-white"
                >
                  {category.title}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Link>
                <div className="bg-popover text-popover-foreground absolute left-0 top-full z-50 hidden min-w-56 overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md group-hover:block group-focus-within:block">
                  {subcategories.map((subcategory) => (
                    <Link
                      key={subcategory._id}
                      href={
                        isProteasome
                          ? `/proteasome#${subcategory.slug}`
                          : `/category/${categorySlug}?category=${categorySlug}&subcategory=${subcategory.slug}`
                      }
                      className="focus:bg-accent focus:text-accent-foreground relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
                    >
                      {subcategory.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Shipping Banner */}
      <div className="bg-teal-50 dark:bg-teal-950/30 border-t border-teal-200 dark:border-teal-900">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4 text-sm font-medium text-teal-900 dark:text-teal-200">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0" />
              <span>Free Same-day Shipping on Domestic Orders over $750</span>
            </div>
            <span className="text-teal-400 dark:text-teal-600">•</span>
            <span>Direct Shipping to Europe and Asia, on orders over $1,000- 50% off overseas shipments</span>
          </div>
        </div>
      </div>
    </header>
  );
}
