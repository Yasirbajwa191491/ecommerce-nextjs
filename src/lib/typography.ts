import { cn } from "@/lib/utils";

/** Hero H1 on home and promo banners */
export const SHOP_HERO_TITLE =
  "font-heading text-[1.5rem] font-bold leading-[1.15] tracking-tight sm:text-[1.75rem] md:text-[1.875rem] lg:text-[2.125rem]";

/** Page-level H1 (products, cart, checkout, track order) */
export const SHOP_PAGE_TITLE =
  "font-heading text-lg font-bold leading-[1.2] tracking-tight text-foreground sm:text-xl md:text-2xl lg:text-[1.75rem]";

/** Lead paragraph under page titles */
export const SHOP_PAGE_LEAD =
  "mt-1.5 text-sm leading-[1.7] text-muted-foreground sm:text-base md:mt-2 md:leading-[1.75]";

/** Section H2 on home and shop (featured, similar products, etc.) */
export const SHOP_SECTION_TITLE =
  "font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl md:text-2xl lg:text-[1.75rem]";

/** Section description / subtitle under headings */
export const SHOP_SECTION_LEAD =
  "mt-1.5 max-w-3xl text-sm leading-[1.7] text-muted-foreground sm:text-base md:mt-2 md:leading-[1.75]";

/** Section action link — View All Products, etc. */
export const SHOP_SECTION_ACTION =
  "text-sm font-semibold sm:text-base md:text-lg";

/** Hero floating product card — name */
export const HERO_CARD_PRODUCT_NAME =
  "line-clamp-1 text-sm font-semibold text-white";

/** Hero floating product card — name (smaller satellite cards) */
export const HERO_CARD_PRODUCT_NAME_COMPACT =
  "line-clamp-1 text-xs font-semibold text-white sm:text-sm";

/** Hero floating product card — price */
export const HERO_CARD_PRICE =
  "text-sm font-bold text-white";

/** Hero floating product card — price (satellite) */
export const HERO_CARD_PRICE_COMPACT =
  "text-xs font-bold text-white sm:text-sm";

/** Category grid card — name on image overlay */
export const CATEGORY_CARD_NAME =
  "text-base font-bold tracking-tight sm:text-lg md:text-xl";

/** Category grid card — product count */
export const CATEGORY_CARD_COUNT =
  "mt-1 text-sm font-medium text-white/90 sm:text-base";

/** Our Story — subtitle under section title */
export const SHOP_STORY_LEAD =
  "mt-2 text-base font-medium leading-[1.7] text-foreground sm:text-lg md:leading-[1.75]";

/** Our Story — body paragraphs */
export const SHOP_STORY_BODY =
  "text-sm leading-[1.75] text-muted-foreground sm:text-base md:leading-[1.8]";

/** Our Story — highlight bullet list */
export const SHOP_STORY_HIGHLIGHT =
  "text-sm leading-[1.75] text-foreground sm:text-base md:leading-[1.8]";

/** Product detail H1 */
export const SHOP_PRODUCT_TITLE =
  "font-heading text-lg font-bold leading-[1.12] tracking-tight text-foreground sm:text-xl md:text-2xl lg:text-[1.75rem]";

/** Card / feature titles — filter panels, contact cards, form sections */
export const SHOP_CARD_TITLE =
  "text-base font-semibold text-foreground sm:text-lg";

/** Subsection H2/H3 on detail, cart, checkout, order pages */
export const SHOP_SUBSECTION_TITLE =
  "text-base font-semibold tracking-tight text-foreground sm:text-lg md:text-xl";

/** Standard body copy — paragraphs, lists, long-form content */
export const SHOP_BODY =
  "text-sm leading-[1.7] text-muted-foreground sm:text-base md:leading-[1.75]";

/** Foreground body copy (lists, highlights on light backgrounds) */
export const SHOP_BODY_EMPHASIS =
  "text-sm leading-[1.7] text-foreground sm:text-base md:leading-[1.75]";

/** Supporting copy — toolbars, stats labels, compact UI (floor 14px) */
export const SHOP_BODY_SM =
  "text-sm leading-relaxed text-muted-foreground";

/** Hero subtitle on dark backgrounds */
export const SHOP_HERO_LEAD =
  "text-sm leading-[1.7] text-white/85 sm:text-base md:text-lg md:leading-[1.75]";

/** Hero promo badge (e.g. Up To 40% Off) */
export const SHOP_HERO_BADGE =
  "inline-flex items-center gap-2 rounded-full border border-[#6254f3]/40 bg-[#6254f3]/20 px-3.5 py-1.5 text-xs font-bold tracking-wide text-white sm:px-4 sm:py-2 sm:text-sm";

/** Hero trust / feature list items */
export const SHOP_HERO_FEATURE =
  "text-sm font-semibold leading-snug text-white/95 sm:text-base";

/** Eyebrow / category badges */
export const SHOP_EYEBROW =
  "inline-flex items-center gap-2 rounded-full border border-[#6254f3]/20 bg-[#6254f3]/5 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[#6254f3] uppercase sm:px-3.5 sm:py-1.5 sm:text-sm";

/** Product card grid — brand / company label */
export const PRODUCT_CARD_BRAND =
  "truncate text-xs font-medium tracking-wide text-muted-foreground uppercase sm:text-sm";

/** Product card grid — product name */
export const PRODUCT_CARD_NAME =
  "line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug tracking-tight text-foreground sm:min-h-[3rem] sm:text-lg";

/** Product card — category pill on image */
export const PRODUCT_CARD_CATEGORY =
  "rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold tracking-wide text-[#6254f3] uppercase shadow-sm backdrop-blur-sm sm:px-3 sm:py-1.5 sm:text-sm";

/** Product card — rating count text */
export const PRODUCT_CARD_RATING =
  "text-xs text-muted-foreground sm:text-sm";

/** Small uppercase labels (brand, SKU, category) */
export const SHOP_META_LABEL =
  "text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:text-sm";

/** Table column headers (cart, checkout) */
export const SHOP_TABLE_HEAD =
  "text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:text-sm";

/** Badges and promotion chips */
export const SHOP_BADGE =
  "text-xs font-bold tracking-wide uppercase sm:text-sm";

/** Cart / checkout line item title */
export const SHOP_LINE_ITEM_TITLE =
  "text-sm font-semibold text-foreground sm:text-base";

/** Cart / checkout line item meta */
export const SHOP_LINE_ITEM_META =
  "text-sm text-muted-foreground";

/** Line item price emphasis */
export const SHOP_LINE_ITEM_PRICE =
  "text-base font-bold tabular-nums text-foreground sm:text-lg";

/** Grand total / prominent price */
export const SHOP_PRICE_TOTAL =
  "text-xl font-bold tabular-nums text-foreground sm:text-2xl";

/** PDP primary price */
export const SHOP_PRICE_PRIMARY =
  "text-xl font-bold tabular-nums text-foreground sm:text-2xl";

/** Breadcrumb / meta nav */
export const SHOP_BREADCRUMB =
  "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground";

/** Header store name / logo — dark navy to match section headings */
export const HEADER_STORE_NAME =
  "font-bold tracking-tight text-[#0a1435]";

export const HEADER_STORE_NAME_MOBILE =
  "max-w-[8.5rem] justify-self-start truncate text-base sm:max-w-none sm:text-lg";

export const HEADER_STORE_NAME_DESKTOP =
  "shrink-0 text-xl xl:text-2xl";

/** Desktop header nav links */
export const HEADER_NAV_LINK =
  "text-sm font-medium tracking-tight sm:text-base lg:text-[1.0625rem]";

/** Mobile drawer nav link label */
export const HEADER_NAV_DRAWER_LABEL =
  "min-w-0 flex-1 text-sm font-medium leading-none sm:text-base";

/** Footer column heading */
export const FOOTER_COLUMN_TITLE =
  "text-xs font-semibold tracking-[0.14em] text-white uppercase sm:text-sm";

/** Footer link */
export const FOOTER_LINK =
  "text-sm text-white/70 transition-colors hover:text-[#a89cff]";

export function shopPageTitle(className?: string) {
  return cn(SHOP_PAGE_TITLE, className);
}

export function shopSectionTitle(className?: string) {
  return cn(SHOP_SECTION_TITLE, className);
}
