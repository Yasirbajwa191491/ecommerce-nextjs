import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin sign in",
  description: "Sign in to manage your ecommerce store",
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
