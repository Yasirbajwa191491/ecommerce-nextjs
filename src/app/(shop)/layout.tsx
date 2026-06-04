import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AppProviders } from "@/providers/AppProviders";

export const dynamic = "force-dynamic";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <Header />
      <main>{children}</main>
      <Footer />
    </AppProviders>
  );
}
