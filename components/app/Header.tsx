"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronDown, Package, ShoppingBag, Sparkles, User } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useCartActions, useTotalItems } from "@/lib/store/cart-store-provider";
import { useChatActions, useIsChatOpen } from "@/lib/store/chat-store-provider";
import { CurrencyConverter } from "@/components/app/CurrencyConverter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ALL_CATEGORIES_QUERYResult } from "@/sanity.types";
import sbbLogo from "@/app/SBB_Logo_full.png";

interface HeaderProps {
  categories: ALL_CATEGORIES_QUERYResult;
}

export function Header({ categories }: HeaderProps) {
  const searchParams = useSearchParams();
  const { openCart } = useCartActions();
  const { openChat } = useChatActions();
  const isChatOpen = useIsChatOpen();
  const totalItems = useTotalItems();
  const activeCategory = searchParams.get("category") || "";
  const activeSubcategory = searchParams.get("subcategory") || "";
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [dropdownHoverCategoryId, setDropdownHoverCategoryId] =
    useState<string | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const cancelScheduledClose = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpenCategoryId(null);
      setDropdownHoverCategoryId(null);
      closeTimeoutRef.current = null;
    }, 120);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src={sbbLogo}
            alt="South Bay Bio"
            priority
            className="h-16 w-auto"
          />
        </Link>

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
        <nav
          className="mx-auto flex h-11 max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8"
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
        >
          {categories.map((category) => {
            const subcategories = category.subcategories || [];
            const isCategoryActive = activeCategory === category.slug;
            const isMenuOpen = openCategoryId === category._id;
            const isHoveringDropdown = dropdownHoverCategoryId === category._id;

            if (subcategories.length === 0) {
              return (
                <Button
                  key={category._id}
                  variant="ghost"
                  asChild
                  className={`h-8 px-3 text-sm transition-all hover:ring-2 hover:ring-teal-500 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-zinc-950 ${
                    isCategoryActive
                      ? "relative pr-6 ring-2 ring-teal-500 ring-offset-2 ring-offset-white hover:bg-zinc-100/60 dark:ring-offset-zinc-950 dark:hover:bg-zinc-900/60"
                      : "hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60"
                  }`}
                >
                  <Link href={`/?category=${category.slug}`} className="relative">
                    {category.title}
                  </Link>
                </Button>
              );
            }

            return (
              <DropdownMenu
                key={category._id}
                open={isMenuOpen}
                onOpenChange={(open) => {
                  if (open) {
                    cancelScheduledClose();
                    if (
                      dropdownHoverCategoryId !== null &&
                      dropdownHoverCategoryId !== category._id
                    ) {
                      setDropdownHoverCategoryId(null);
                    }
                    setOpenCategoryId(category._id);
                  } else if (openCategoryId === category._id) {
                    scheduleClose();
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    onMouseEnter={() => {
                      cancelScheduledClose();
                      if (
                        dropdownHoverCategoryId !== null &&
                        dropdownHoverCategoryId !== category._id
                      ) {
                        setDropdownHoverCategoryId(null);
                      }
                      setOpenCategoryId(category._id);
                    }}
                    onMouseLeave={() => {
                      if (!isHoveringDropdown) {
                        scheduleClose();
                      }
                    }}
                    onFocus={() => setOpenCategoryId(category._id)}
                    className={`relative h-8 px-3 text-sm transition-all hover:ring-2 hover:ring-teal-500 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-zinc-950 ${
                      isCategoryActive
                        ? "pr-6 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60"
                        : "hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60"
                    } ${
                      isMenuOpen
                        ? "ring-2 ring-teal-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950"
                        : ""
                    }`}
                  >
                    {category.title}
                    <ChevronDown className="ml-1 h-4 w-4" />
                    {isHoveringDropdown && (
                      <span className="pointer-events-none absolute right-1 top-1 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="min-w-56"
                  onMouseEnter={() => {
                    cancelScheduledClose();
                    setOpenCategoryId(category._id);
                    setDropdownHoverCategoryId(category._id);
                  }}
                  onMouseLeave={() => {
                    setDropdownHoverCategoryId(null);
                    scheduleClose();
                  }}
                >
                  {subcategories.map((subcategory) => (
                    <DropdownMenuItem key={subcategory._id} asChild>
                      <Link
                        href={`/?category=${category.slug}&subcategory=${subcategory.slug}`}
                      >
                        {subcategory.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
