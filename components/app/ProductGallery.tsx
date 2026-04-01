"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  imageUrls: string[];
  productName: string | null;
}

export function ProductGallery({ imageUrls, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <span className="text-zinc-400">No images available</span>
      </div>
    );
  }

  const selectedImageUrl = imageUrls[selectedIndex];
  const selectedIsExternal =
    !!selectedImageUrl && !selectedImageUrl.includes("cdn.sanity.io");

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {selectedImageUrl ? (
          <Image
            src={selectedImageUrl}
            alt={productName ?? "Product image"}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            unoptimized={selectedIsExternal}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            No image
          </div>
        )}
      </div>

      {/* Thumbnail Grid */}
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {imageUrls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`View image ${index + 1}`}
              aria-pressed={selectedIndex === index}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md bg-zinc-100 transition-all dark:bg-zinc-800",
                selectedIndex === index
                  ? "ring-2 ring-zinc-900 dark:ring-zinc-100"
                  : "hover:opacity-75",
              )}
            >
              {url ? (
                <Image
                  src={url}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="100px"
                  unoptimized={!url.includes("cdn.sanity.io")}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                  N/A
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
