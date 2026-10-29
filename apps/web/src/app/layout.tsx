import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ShadcnProviders } from "@/providers/ShadcnProviders";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";
import { getToken } from "@/lib/auth-server";
import { STORE_NAME } from "@/lib/site";


export const metadata: Metadata = {
  title: `${STORE_NAME} | Premium Online Shopping`,
  description: "Discover quality products with a fast, modern shopping experience.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const token = await getToken();
  return (
    <html
      lang="en"
      className={cn("font-sans", "light")}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ConvexClientProvider initialToken={token}>
          <ShadcnProviders>{children}</ShadcnProviders>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
