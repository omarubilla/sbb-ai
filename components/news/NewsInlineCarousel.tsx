"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NewsItem } from "@/data/news";

interface NewsInlineCarouselProps {
  items: NewsItem[];
}

export function NewsInlineCarousel({ items }: NewsInlineCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api],
  );

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());

    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        News
      </p>
      <h3 className="mt-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Research Highlights
      </h3>

      <div className="mt-4">
        <Carousel
          setApi={setApi}
          opts={{
            loop: true,
            align: "start",
          }}
          plugins={[
            Autoplay({
              delay: 6000,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
            }),
          ]}
          aria-label="Research highlights"
        >
          <CarouselContent className="-ml-0">
            {items.map((item) => (
              <CarouselItem key={item.title} className="pl-0">
                <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 dark:bg-zinc-950 dark:ring-zinc-800">
                  <Link href={item.link} className="block">
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.imageAlt}
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-105"
                        sizes="(max-width: 1280px) 100vw, 33vw"
                      />
                    </div>
                  </Link>

                  <div className="p-4">
                    <Badge
                      variant="secondary"
                      className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300"
                    >
                      {item.tag}
                    </Badge>
                    <h4 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </h4>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {item.description}
                    </p>
                    <Link
                      href={item.link}
                      className="mt-3 inline-flex text-sm font-medium text-zinc-900 hover:text-blue-700 dark:text-zinc-100 dark:hover:text-blue-300"
                    >
                      Read more -&gt;
                    </Link>
                  </div>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {items.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2" aria-label="Select news slide">
            {items.map((item, index) => (
              <button
                key={`news-inline-dot-${item.title}`}
                type="button"
                onClick={() => scrollTo(index)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-300",
                  current === index
                    ? "w-6 bg-teal-500"
                    : "bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600",
                )}
                aria-label={`Go to news slide ${index + 1}`}
                aria-current={current === index ? "true" : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
