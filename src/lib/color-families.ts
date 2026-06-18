/** Client-side mirror of convex/lib/colorFamilies.ts for filter UI. */

export const COLOR_FAMILY_HEX: Record<string, string> = {
  Black: "#000000",
  White: "#FFFFFF",
  Red: "#E53935",
  Blue: "#1E88E5",
  Green: "#43A047",
  Gold: "#FDD835",
  Silver: "#C0C0C0",
  Gray: "#9E9E9E",
  Brown: "#795548",
  Orange: "#FB8C00",
  Purple: "#8E24AA",
  Pink: "#EB7185",
  Yellow: "#FDD835",
  Teal: "#00897B",
};

export function getColorFamilyHex(family: string): string | undefined {
  return COLOR_FAMILY_HEX[family];
}
