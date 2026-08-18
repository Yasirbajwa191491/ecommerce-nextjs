import { NotFoundPageView } from "@/components/errors/not-found-page-view";

export default function ShopNotFound() {
  return (
    <NotFoundPageView
      variant="shop"
      description="This page isn't in our store. Check the URL or head back to shop."
    />
  );
}
