export const PAGE_GUTTER = {
  paddingLeft: "clamp(1rem, 3vw, 3rem)",
  paddingRight: "clamp(1rem, 3vw, 3rem)",
} as const;

/** Primary CTA — auto width on all breakpoints (matches cart, checkout, about). */
export const PRIMARY_BUTTON_CLASS =
  "h-11 w-auto shrink-0 gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-50 [&_svg]:!text-white";

export const OUTLINE_BUTTON_CLASS =
  "h-11 w-auto shrink-0 gap-2 rounded-full border-[#6254f3]/30 px-8 text-sm font-semibold text-[#6254f3] transition-colors hover:bg-[#6254f3]/5";

/** White surface button for purple/dark banners (Shop Now on sale cards). */
export const SURFACE_BUTTON_CLASS =
  "h-11 w-auto shrink-0 gap-2 rounded-full border-white bg-white px-8 text-sm font-semibold !text-[#6254f3] shadow-md transition-all hover:bg-white/90 hover:!text-[#5548e0] active:scale-[0.98] [&_svg]:!text-[#6254f3]";

/** Ghost button on dark hero/CTA backgrounds. */
export const GHOST_ON_DARK_BUTTON_CLASS =
  "h-11 w-auto shrink-0 gap-2 rounded-full border-white/25 bg-white/5 px-8 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white";

/** Compact outline for section “View all” links. */
export const SECTION_ACTION_BUTTON_CLASS =
  "h-10 w-fit shrink-0 gap-2 self-start rounded-full border-[#6254f3]/30 px-5 text-sm font-semibold text-[#6254f3] hover:bg-[#6254f3]/5 sm:self-auto";

export const BUTTON_ROW_CLASS =
  "flex flex-row flex-wrap items-center justify-center gap-3 md:justify-start";

export const ABOUT_CARD_GRID_CLASS =
  "mt-6 grid grid-cols-2 gap-3 sm:mt-8 md:grid-cols-3 md:gap-4 lg:gap-5";
