import { cn } from "@/lib/utils";

/** Page-level H1 (products, cart, checkout, track order) */
export const SHOP_PAGE_TITLE =
  "font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]";

/** Lead paragraph under page titles */
export const SHOP_PAGE_LEAD =
  "mt-2 text-base leading-relaxed text-muted-foreground sm:text-lg md:mt-3";

/** Section H2 on home and shop (featured, similar products, etc.) */
export const SHOP_SECTION_TITLE =
  "font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl";

/** Section description / subtitle */
export const SHOP_SECTION_LEAD =
  "mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg md:mt-4";

/** Product detail H1 */
export const SHOP_PRODUCT_TITLE =
  "font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-[1.08]";

/** Card / feature titles */
export const SHOP_CARD_TITLE =
  "text-lg font-semibold text-foreground sm:text-xl";

/** Subsection H2/H3 on detail and content pages */
export const SHOP_SUBSECTION_TITLE =
  "text-xl font-semibold tracking-tight text-foreground sm:text-2xl md:text-3xl";

/** Standard body copy */
export const SHOP_BODY =
  "text-base leading-relaxed text-muted-foreground sm:text-lg";

/** Smaller supporting copy (still readable on mobile) */
export const SHOP_BODY_SM =
  "text-sm leading-relaxed text-muted-foreground sm:text-base";

/** Eyebrow / category badges */
export const SHOP_EYEBROW =
  "inline-flex items-center gap-2 rounded-full border border-[#6254f3]/20 bg-[#6254f3]/5 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-[#6254f3] uppercase sm:text-sm";

/** Small uppercase labels (brand, SKU, category) */
export const SHOP_META_LABEL =
  "text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase sm:text-sm";

/** Breadcrumb / meta nav */
export const SHOP_BREADCRUMB =
  "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:text-base";

export function shopPageTitle(className?: string) {
  return cn(SHOP_PAGE_TITLE, className);
}

export function shopSectionTitle(className?: string) {
  return cn(SHOP_SECTION_TITLE, className);
}
