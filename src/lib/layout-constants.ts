export const PAGE_GUTTER = {
  paddingLeft: "clamp(1rem, 3vw, 3rem)",
  paddingRight: "clamp(1rem, 3vw, 3rem)",
} as const;

/** Home page section rhythm — tighter than marketing/legal pages */
export const HOME_SECTION_PADDING_Y = "py-8 sm:py-10 md:py-12 lg:py-14";

/** Generous vertical section padding for policy / long-form pages */
export const SECTION_PADDING_Y = "py-10 sm:py-12 md:py-14 lg:py-16";

/** Catalog / transaction page body */
export const CONTENT_SECTION_PADDING_Y = "py-4 sm:py-5 lg:py-6";

/** Catalog page title band only — avoids double-stacked huge gaps */
export const PAGE_HEADER_PADDING_Y = "pt-5 pb-3 sm:pt-6 sm:pb-4 md:pt-8 md:pb-5";

/** Paragraph spacing in prose blocks */
export const PARAGRAPH_SPACING = "mb-6 sm:mb-8";

/** Max width for text-heavy content */
export const CONTENT_PROSE_WIDTH = "mx-auto max-w-3xl";

/** Primary CTA — auto width on all breakpoints (matches cart, checkout, about). */
export const PRIMARY_BUTTON_CLASS =
  "h-12 w-auto shrink-0 gap-2 rounded-full bg-[#6254f3] px-9 text-base font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-50 [&_svg]:!text-white";

export const OUTLINE_BUTTON_CLASS =
  "h-12 w-auto shrink-0 gap-2 rounded-full border-[#6254f3]/30 px-9 text-base font-semibold text-[#6254f3] transition-colors hover:bg-[#6254f3]/5";

/** White surface button for purple/dark banners (Shop Now on sale cards). */
export const SURFACE_BUTTON_CLASS =
  "h-12 w-auto shrink-0 gap-2 rounded-full border-white bg-white px-9 text-base font-semibold !text-[#6254f3] shadow-md transition-all hover:bg-white/90 hover:!text-[#5548e0] active:scale-[0.98] [&_svg]:!text-[#6254f3]";

/** Ghost button on dark hero/CTA backgrounds. */
export const GHOST_ON_DARK_BUTTON_CLASS =
  "h-12 w-auto shrink-0 gap-2 rounded-full border-white/25 bg-white/5 px-9 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white";

/** Larger hero CTAs — Shop Now / Browse Categories on home hero */
export const HERO_PRIMARY_BUTTON_CLASS =
  "h-11 w-auto shrink-0 gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] sm:h-12 sm:px-9 sm:text-base [&_svg]:size-4 [&_svg]:!text-white sm:[&_svg]:size-5";

export const HERO_GHOST_BUTTON_CLASS =
  "h-11 w-auto shrink-0 gap-2 rounded-full border-white/25 bg-white/5 px-8 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white sm:h-12 sm:px-9 sm:text-base";

/** Compact outline for section “View all” links. */
export const SECTION_ACTION_BUTTON_CLASS =
  "h-10 w-fit shrink-0 gap-2 self-start rounded-full border-[#6254f3]/30 px-5 text-sm font-semibold text-[#6254f3] hover:bg-[#6254f3]/5 sm:h-11 sm:self-auto sm:px-6 sm:text-base";

export const BUTTON_ROW_CLASS =
  "flex flex-row flex-wrap items-center justify-center gap-3 md:justify-start";

export const ABOUT_CARD_GRID_CLASS =
  "mt-6 grid grid-cols-2 gap-3 sm:mt-8 md:grid-cols-3 md:gap-4 lg:gap-5";
