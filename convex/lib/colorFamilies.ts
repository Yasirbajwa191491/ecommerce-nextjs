/** Map product color values (hex or names) to display families for catalog filters. */

const HEX_TO_FAMILY: Record<string, string> = {
  "#000000": "Black",
  "#FFFFFF": "White",
  "#E53935": "Red",
  "#FB8C00": "Orange",
  "#43A047": "Green",
  "#1E88E5": "Blue",
  "#8E24AA": "Purple",
  "#00897B": "Teal",
  "#7E57C2": "Purple",
  "#EB7185": "Pink",
  "#FDD835": "Gold",
  "#7CB342": "Green",
};

const NAME_TO_FAMILY: Record<string, string> = {
  black: "Black",
  white: "White",
  red: "Red",
  blue: "Blue",
  green: "Green",
  gold: "Gold",
  silver: "Silver",
  gray: "Gray",
  grey: "Gray",
  brown: "Brown",
  orange: "Orange",
  purple: "Purple",
  pink: "Pink",
  yellow: "Yellow",
  teal: "Teal",
  navy: "Blue",
  beige: "Brown",
};

const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_REGEX.test(withHash)) return null;
  if (withHash.length === 4) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return withHash.toUpperCase();
}

export function resolveColorFamily(color: string): string {
  const trimmed = color.trim();
  if (!trimmed) return "Other";

  const hex = normalizeHex(trimmed);
  if (hex && HEX_TO_FAMILY[hex]) {
    return HEX_TO_FAMILY[hex]!;
  }

  const lower = trimmed.toLowerCase();
  if (NAME_TO_FAMILY[lower]) {
    return NAME_TO_FAMILY[lower]!;
  }

  // Title-case unknown values as family names
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function resolveProductColorFamilies(colors: string[]): string[] {
  const families = new Set<string>();
  for (const color of colors) {
    families.add(resolveColorFamily(color));
  }
  return Array.from(families);
}

export function colorFamilySlug(family: string): string {
  return family
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function colorFamilyFromSlug(
  slug: string,
  knownFamilies: string[]
): string | undefined {
  const normalized = slug.trim().toLowerCase();
  return knownFamilies.find(
    (family) => colorFamilySlug(family) === normalized
  );
}

/** Hex swatch for known color families (filter UI). */
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
