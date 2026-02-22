"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFormattedPrice } from "@/lib/hooks/useFormattedPrice";
import type { FEATURED_PRODUCTS_QUERYResult } from "@/sanity.types";

type FeaturedProduct = FEATURED_PRODUCTS_QUERYResult[number];

const LEFT_BANNERS = [
  {
    imageSrc: "/TR-FRET-Ubi-AssaysSlide.jpeg",
    badge: "Research Grade",
    title: "Precision Tools for Protein Science",
    description:
      "Curated reagents and assays for high-confidence discovery workflows.",
  },
  {
    imageSrc: "/C-TerminalDerivatives.jpeg",
    badge: "Fast Shipping",
    title: "Built for Reproducible Results",
    description:
      "High-quality bioproducts with validated performance across workflows.",
  },
  {
    imageSrc: "/Proteasomes&Substrates.jpeg",
    badge: "Expert Support",
    title: "Powering Next-Generation Discovery",
    description:
      "From screening to validation, find the right tools for your pipeline.",
  },
];

interface FeaturedCarouselProps {
  products: FEATURED_PRODUCTS_QUERYResult;
}

export function FeaturedCarousel({ products }: FeaturedCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const formatPrice = useFormattedPrice();

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api],
  );

  if (products.length === 0) {
    return null;
  }

  const activeBanner = LEFT_BANNERS[current % LEFT_BANNERS.length];

  return (
    <div className="w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="flex min-h-[340px] flex-col md:min-h-[390px] md:flex-row lg:min-h-[430px]">
        <div className="relative h-56 w-full overflow-hidden md:h-auto md:w-3/5">
          <Image
            src={activeBanner.imageSrc}
            alt={activeBanner.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 60vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/80 via-zinc-900/40 to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-end px-6 py-8 sm:px-8 md:px-10 lg:px-12">
            <Badge
              variant="secondary"
              className="mb-4 w-fit bg-white/20 text-white hover:bg-white/30"
            >
              {activeBanner.badge}
            </Badge>
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {activeBanner.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-zinc-200 sm:text-base">
              {activeBanner.description}
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-2/5">
          <Carousel
            setApi={setApi}
            opts={{
              loop: true,
              align: "start",
            }}
            plugins={[
              Autoplay({
                delay: 5000,
                stopOnInteraction: false,
                stopOnMouseEnter: true,
              }),
            ]}
            className="h-full w-full"
          >
            <CarouselContent className="-ml-0 h-full">
              {products.map((product) => (
                <CarouselItem key={product._id} className="pl-0">
                  <FeaturedSlide product={product} formatPrice={formatPrice} />
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="left-4 border-zinc-700 bg-zinc-800/80 text-white hover:bg-zinc-700 hover:text-white" />
            <CarouselNext className="right-4 border-zinc-700 bg-zinc-800/80 text-white hover:bg-zinc-700 hover:text-white" />
          </Carousel>

          {count > 1 && (
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-6">
              {Array.from({ length: count }).map((_, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  onClick={() => scrollTo(index)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300",
                    current === index
                      ? "w-6 bg-teal-500"
                      : "bg-white/40 hover:bg-white/60",
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FeaturedSlideProps {
  product: FeaturedProduct;
  formatPrice: (amount: number | null | undefined) => string;
}

function FeaturedSlide({ product, formatPrice }: FeaturedSlideProps) {
  return (
    <div className="flex h-full min-h-[340px] w-full flex-col justify-center px-6 py-8 md:min-h-[390px] md:px-10 lg:min-h-[430px] lg:px-12">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Featured Products
      </p>

        {product.category && (
          <Badge
            variant="secondary"
            className="mb-4 w-fit bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          >
            {product.category.title}
          </Badge>
        )}

        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          {product.name}
        </h2>

        {product.description && (
          <p className="mt-4 line-clamp-3 text-sm text-zinc-300 sm:text-base lg:text-lg">
            {product.description}
          </p>
        )}

        <p className="mt-6 text-3xl font-bold text-white lg:text-4xl">
          {formatPrice(product.price)}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-white text-zinc-900 hover:bg-zinc-100"
          >
            <Link href={`/products/${product.slug}`}>
              Shop Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
    </div>
  );
}
