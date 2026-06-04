import Link from "next/link";
import { NotFoundPageView } from "@/components/errors/not-found-page-view";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b bg-[#6254f3] px-4 py-4 text-white sm:px-6">
        <Link href="/admin/login" className="text-sm font-semibold hover:underline">
          Admin · Ecommerce Store
        </Link>
      </header>
      <NotFoundPageView
        variant="admin"
        description="This admin URL doesn't exist. Sign in or open the dashboard."
      />
    </div>
  );
}
