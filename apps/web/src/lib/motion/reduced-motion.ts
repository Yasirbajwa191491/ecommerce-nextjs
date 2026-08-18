import type { Variants } from "framer-motion";

export const instantVariants: Variants = {
  hidden: {},
  visible: {},
};

export function withReducedMotion(
  variants: Variants,
  reduceMotion: boolean | null
): Variants {
  if (reduceMotion) return instantVariants;
  return variants;
}

export function motionProps(reduceMotion: boolean | null) {
  if (reduceMotion) {
    return { initial: false as const, animate: undefined, transition: { duration: 0 } };
  }
  return {};
}
