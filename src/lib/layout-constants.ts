export const PAGE_GUTTER = {
  paddingLeft: "clamp(1rem, 3vw, 3rem)",
  paddingRight: "clamp(1rem, 3vw, 3rem)",
} as const;

/** Home page section rhythm — tighter than marketing/legal pages */
export const HOME_SECTION_PADDING_Y = "py-10 sm:py-12 md:py-14 lg:py-16";

/** Generous vertical section padding for policy / long-form pages */
export const SECTION_PADDING_Y = "py-12 sm:py-14 md:py-16 lg:py-20";

/** Catalog / transaction page body */
export const CONTENT_SECTION_PADDING_Y = "py-5 sm:py-6 lg:py-8";

/** Catalog page title band only — avoids double-stacked huge gaps */
export const PAGE_HEADER_PADDING_Y = "pt-6 pb-4 sm:pt-8 sm:pb-5 md:pt-10 md:pb-6";

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
  "h-12 w-auto shrink-0 gap-2.5 rounded-full bg-[#6254f3] px-9 text-base font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] sm:h-[3.25rem] sm:px-10 sm:text-lg [&_svg]:size-5 [&_svg]:!text-white";

export const HERO_GHOST_BUTTON_CLASS =
  "h-12 w-auto shrink-0 gap-2.5 rounded-full border-white/25 bg-white/5 px-9 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white sm:h-[3.25rem] sm:px-10 sm:text-lg";

/** Compact outline for section “View all” links. */
export const SECTION_ACTION_BUTTON_CLASS =
  "h-12 w-fit shrink-0 gap-2.5 self-start rounded-full border-[#6254f3]/30 px-6 text-base font-semibold text-[#6254f3] hover:bg-[#6254f3]/5 sm:self-auto sm:px-7 sm:text-lg md:text-xl";

export const BUTTON_ROW_CLASS =
  "flex flex-row flex-wrap items-center justify-center gap-3 md:justify-start";

export const ABOUT_CARD_GRID_CLASS =
  "mt-6 grid grid-cols-2 gap-3 sm:mt-8 md:grid-cols-3 md:gap-4 lg:gap-5";
