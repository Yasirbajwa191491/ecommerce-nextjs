import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AppProviders } from "@/providers/AppProviders";

export const dynamic = "force-dynamic";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </AppProviders>
  );
}
