import { ShopPageTransition } from "@/components/motion/motion-page-transition";

export default function ShopTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopPageTransition>{children}</ShopPageTransition>;
}
