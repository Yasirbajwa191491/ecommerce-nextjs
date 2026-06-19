import type { Variants } from "framer-motion";
import { EASE_PREMIUM } from "./transitions";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

/** Apple-style headline reveal — slow drift up with subtle de-blur */
export const appleHeadline: Variants = {
  hidden: { opacity: 0, y: 56, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.95, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/** Apple-style body / card text entrance */
export const appleFadeUp: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/** Section header line items (badge → title → description) */
export const sectionHeaderItem: Variants = {
  hidden: { opacity: 0, y: 44, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.85, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const sectionHeaderContainer = (
  staggerChildren = 0.14,
  delayChildren = 0.04
): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_PREMIUM },
  },
};

export const dropdown: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: EASE_PREMIUM },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.98,
    transition: { duration: 0.2, ease: EASE_PREMIUM },
  },
};

export const staggerContainer = (
  staggerChildren = 0.08,
  delayChildren = 0
): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const staggerItemApple: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const staggerItemScale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: EASE_PREMIUM },
  },
};

export const cardHover = {
  y: -8,
  scale: 1.015,
  transition: {
    type: "spring" as const,
    stiffness: 260,
    damping: 26,
    mass: 0.85,
  },
};

export const cardTap = {
  scale: 0.99,
  transition: { duration: 0.15, ease: EASE_PREMIUM },
};

export const badgePop: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 18,
    },
  },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE_PREMIUM },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.2, ease: EASE_PREMIUM },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: EASE_PREMIUM },
  },
  exit: {
    opacity: 0,
    x: 12,
    transition: { duration: 0.25, ease: EASE_PREMIUM },
  },
};

export type RevealVariant = "up" | "scale" | "fade" | "left" | "right" | "headline" | "apple";

export const revealVariants: Record<RevealVariant, Variants> = {
  up: fadeUp,
  scale: scaleIn,
  fade: fadeIn,
  left: slideFromLeft,
  right: slideFromRight,
  headline: appleHeadline,
  apple: appleFadeUp,
};
