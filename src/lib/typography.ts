import { cn } from "@/lib/utils";

/** Hero H1 on home and promo banners */
export const SHOP_HERO_TITLE =
  "font-heading text-[1.625rem] font-bold leading-[1.15] tracking-tight sm:text-[1.875rem] md:text-[2.125rem] lg:text-[2.375rem]";

/** Page-level H1 (products, cart, checkout, track order) */
export const SHOP_PAGE_TITLE =
  "font-heading text-xl font-bold leading-[1.2] tracking-tight text-foreground sm:text-2xl md:text-[1.75rem] lg:text-[2rem]";

/** Lead paragraph under page titles */
export const SHOP_PAGE_LEAD =
  "mt-2 text-base leading-[1.75] text-muted-foreground sm:text-lg md:mt-2.5 md:leading-[1.8]";

/** Section H2 on home and shop (featured, similar products, etc.) */
export const SHOP_SECTION_TITLE =
  "font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-[1.75rem] lg:text-[2rem]";

/** Section description / subtitle under headings */
export const SHOP_SECTION_LEAD =
  "mt-2 max-w-3xl text-base leading-[1.75] text-muted-foreground sm:text-lg md:mt-3 md:leading-[1.8]";

/** Section action link — View All Products, etc. */
export const SHOP_SECTION_ACTION =
  "text-base font-semibold sm:text-lg md:text-xl";

/** Hero floating product card — name */
export const HERO_CARD_PRODUCT_NAME =
  "line-clamp-1 text-sm font-semibold text-white sm:text-base";

/** Hero floating product card — name (smaller satellite cards) */
export const HERO_CARD_PRODUCT_NAME_COMPACT =
  "line-clamp-1 text-xs font-semibold text-white sm:text-sm";

/** Hero floating product card — price */
export const HERO_CARD_PRICE =
  "text-sm font-bold text-white sm:text-base";

/** Hero floating product card — price (satellite) */
export const HERO_CARD_PRICE_COMPACT =
  "text-xs font-bold text-white sm:text-sm";

/** Category grid card — name on image overlay */
export const CATEGORY_CARD_NAME =
  "text-lg font-bold tracking-tight sm:text-xl md:text-2xl";

/** Category grid card — product count */
export const CATEGORY_CARD_COUNT =
  "mt-1 text-base font-medium text-white/90 sm:text-lg md:text-xl";

/** Our Story — subtitle under section title */
export const SHOP_STORY_LEAD =
  "mt-3 text-lg font-medium leading-[1.75] text-foreground sm:text-xl md:text-[1.25rem] md:leading-[1.8]";

/** Our Story — body paragraphs */
export const SHOP_STORY_BODY =
  "text-base leading-[1.8] text-muted-foreground sm:text-lg md:text-[1.125rem]";

/** Our Story — highlight bullet list */
export const SHOP_STORY_HIGHLIGHT =
  "text-base leading-[1.8] text-foreground sm:text-lg md:text-[1.125rem]";

/** Product detail H1 */
export const SHOP_PRODUCT_TITLE =
  "font-heading text-xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-2xl md:text-[1.75rem] lg:text-[2rem]";

/** Card / feature titles — filter panels, contact cards, form sections */
export const SHOP_CARD_TITLE =
  "text-base font-semibold text-foreground sm:text-lg md:text-xl";

/** Subsection H2/H3 on detail, cart, checkout, order pages */
export const SHOP_SUBSECTION_TITLE =
  "text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-[1.375rem]";

/** Standard body copy — paragraphs, lists, long-form content */
export const SHOP_BODY =
  "text-base leading-[1.75] text-muted-foreground sm:text-[1.0625rem] md:text-lg md:leading-[1.85]";

/** Foreground body copy (lists, highlights on light backgrounds) */
export const SHOP_BODY_EMPHASIS =
  "text-base leading-[1.75] text-foreground sm:text-[1.0625rem] md:text-lg md:leading-[1.85]";

/** Supporting copy — toolbars, stats labels, compact UI (floor 14px) */
export const SHOP_BODY_SM =
  "text-sm leading-relaxed text-muted-foreground sm:text-base";

/** Hero subtitle on dark backgrounds */
export const SHOP_HERO_LEAD =
  "text-base leading-[1.75] text-white/85 sm:text-lg md:text-xl lg:text-[1.125rem] lg:leading-[1.8]";

/** Hero promo badge (e.g. Up To 40% Off) */
export const SHOP_HERO_BADGE =
  "inline-flex items-center gap-2 rounded-full border border-[#6254f3]/40 bg-[#6254f3]/20 px-4 py-2 text-sm font-bold tracking-wide text-white sm:px-5 sm:py-2.5 sm:text-base md:text-lg";

/** Hero trust / feature list items */
export const SHOP_HERO_FEATURE =
  "text-base font-semibold leading-snug text-white/95 sm:text-lg md:text-xl";

/** Eyebrow / category badges */
export const SHOP_EYEBROW =
  "inline-flex items-center gap-2 rounded-full border border-[#6254f3]/20 bg-[#6254f3]/5 px-3.5 py-1.5 text-sm font-semibold tracking-[0.14em] text-[#6254f3] uppercase sm:px-4 sm:py-2 sm:text-base md:text-lg";

/** Product card grid — brand / company label */
export const PRODUCT_CARD_BRAND =
  "truncate text-sm font-medium tracking-wide text-muted-foreground uppercase sm:text-base";

/** Product card grid — product name (18–22px) */
export const PRODUCT_CARD_NAME =
  "line-clamp-2 min-h-[3.25rem] text-lg font-semibold leading-snug tracking-tight text-foreground sm:min-h-[3.5rem] sm:text-xl";

/** Product card — category pill on image */
export const PRODUCT_CARD_CATEGORY =
  "rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold tracking-wide text-[#6254f3] uppercase shadow-sm backdrop-blur-sm";

/** Product card — rating count text */
export const PRODUCT_CARD_RATING =
  "text-sm text-muted-foreground sm:text-base";

/** Small uppercase labels (brand, SKU, category) */
export const SHOP_META_LABEL =
  "text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase";

/** Table column headers (cart, checkout) */
export const SHOP_TABLE_HEAD =
  "text-sm font-semibold tracking-wide text-muted-foreground uppercase";

/** Badges and promotion chips */
export const SHOP_BADGE =
  "text-sm font-bold tracking-wide uppercase";

/** Cart / checkout line item title */
export const SHOP_LINE_ITEM_TITLE =
  "text-base font-semibold text-foreground sm:text-lg";

/** Cart / checkout line item meta */
export const SHOP_LINE_ITEM_META =
  "text-sm text-muted-foreground sm:text-base";

/** Line item price emphasis */
export const SHOP_LINE_ITEM_PRICE =
  "text-lg font-bold tabular-nums text-foreground sm:text-xl";

/** Grand total / prominent price */
export const SHOP_PRICE_TOTAL =
  "text-2xl font-bold tabular-nums text-foreground sm:text-3xl";

/** PDP primary price */
export const SHOP_PRICE_PRIMARY =
  "text-2xl font-bold tabular-nums text-foreground sm:text-3xl";

/** Breadcrumb / meta nav */
export const SHOP_BREADCRUMB =
  "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:text-base";

/** Header store name / logo — dark navy to match section headings */
export const HEADER_STORE_NAME =
  "font-bold tracking-tight text-[#0a1435]";

export const HEADER_STORE_NAME_MOBILE =
  "max-w-[8.5rem] justify-self-start truncate text-base sm:max-w-none sm:text-lg md:text-xl";

export const HEADER_STORE_NAME_DESKTOP =
  "shrink-0 text-2xl xl:text-[1.75rem]";

/** Desktop header nav links */
export const HEADER_NAV_LINK =
  "text-base font-medium tracking-tight sm:text-lg lg:text-[1.0625rem] xl:text-lg";

/** Mobile drawer nav link label */
export const HEADER_NAV_DRAWER_LABEL =
  "min-w-0 flex-1 text-base font-medium leading-none sm:text-lg";

/** Footer column heading */
export const FOOTER_COLUMN_TITLE =
  "text-sm font-semibold tracking-[0.14em] text-white uppercase";

/** Footer link */
export const FOOTER_LINK =
  "text-sm text-white/70 transition-colors hover:text-[#a89cff] sm:text-base";

export function shopPageTitle(className?: string) {
  return cn(SHOP_PAGE_TITLE, className);
}

export function shopSectionTitle(className?: string) {
  return cn(SHOP_SECTION_TITLE, className);
}
