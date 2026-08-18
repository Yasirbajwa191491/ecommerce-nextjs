import Link from "next/link";
import { NotFoundPageView } from "@/components/errors/not-found-page-view";

export default function RootNotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b px-4 py-4 sm:px-6">
        <Link
          href="/home"
          className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          Ecommerce Store
        </Link>
      </header>
      <NotFoundPageView variant="shop" />
    </div>
  );
}
