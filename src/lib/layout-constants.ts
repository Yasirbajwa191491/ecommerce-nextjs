export const PAGE_GUTTER = {
  paddingLeft: "clamp(1rem, 3vw, 3rem)",
  paddingRight: "clamp(1rem, 3vw, 3rem)",
} as const;

export const PRIMARY_BUTTON_CLASS =
  "h-11 w-auto shrink-0 gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold text-white shadow-md shadow-[#6254f3]/25 transition-colors hover:bg-[#5548e0]";

export const OUTLINE_BUTTON_CLASS =
  "h-11 w-auto shrink-0 rounded-full border-[#6254f3]/30 px-8 text-sm font-semibold text-[#6254f3] hover:bg-[#6254f3]/5";

export const BUTTON_ROW_CLASS =
  "flex flex-row flex-wrap items-center justify-center gap-3 lg:justify-start";

export const ABOUT_CARD_GRID_CLASS =
  "mt-6 grid grid-cols-2 gap-3 sm:mt-8 md:grid-cols-3 md:gap-4 lg:gap-5";
