"use client";

import { useQuery } from "convex/react";
import { BadgeCheck, MessageSquareQuote } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { ProductStars } from "@/components/products/product-stars";
import { SectionHeader } from "@/components/home/section-header";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_GUTTER } from "@/lib/layout-constants";

export function CustomerReviewsSection() {
  const reviews = useQuery(api.productReviews.listHomepageTestimonials, {
    limit: 8,
  });

  return (
    <section className="bg-muted/30 py-10 sm:py-14 md:py-16">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <ScrollReveal variant="fade">
          <SectionHeader
            badge="Testimonials"
            badgeIcon={MessageSquareQuote}
            title="Customer Reviews"
            description="Real feedback from verified shoppers — only approved reviews are shown."
            align="center"
            className="sm:items-center sm:text-center"
          />
        </ScrollReveal>

        {reviews === undefined ? (
          <div className="mt-8 flex gap-4 overflow-hidden lg:mt-10">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-52 w-[min(360px,85vw)] shrink-0 rounded-2xl"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <ScrollReveal className="mt-8" variant="scale">
            <div className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-12 text-center">
              <p className="text-base font-semibold text-foreground">
                No reviews yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Customer reviews will appear here once approved.
              </p>
            </div>
          </ScrollReveal>
        ) : (
          <ScrollReveal className="relative mt-8 lg:mt-10" delay={120}>
            <Carousel
              opts={{ align: "start", dragFree: true }}
              className="w-full"
            >
              <CarouselContent className="-ml-3 sm:-ml-4">
                {reviews.map((review) => (
                  <CarouselItem
                    key={review._id}
                    className="basis-[92%] pl-3 sm:basis-[75%] sm:pl-4 md:basis-[52%] lg:basis-[38%]"
                  >
                    <article className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1 hover:border-[#6254f3]/20 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            {review.customerName}
                          </p>
                          <ProductStars
                            rating={review.rating}
                            className="mt-2"
                          />
                        </div>
                        {review.isVerifiedPurchase ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-emerald-500/10 text-emerald-700"
                          >
                            <BadgeCheck className="size-3.5" />
                            Verified
                          </Badge>
                        ) : null}
                      </div>
                      {review.title ? (
                        <h3 className="mt-4 text-sm font-semibold text-foreground">
                          {review.title}
                        </h3>
                      ) : null}
                      <p className="mt-2 line-clamp-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {review.content}
                      </p>
                    </article>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-1 size-8 border-border/80 bg-background shadow-md sm:-left-2 sm:size-9" />
              <CarouselNext className="-right-1 size-8 border-border/80 bg-background shadow-md sm:-right-2 sm:size-9" />
            </Carousel>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
