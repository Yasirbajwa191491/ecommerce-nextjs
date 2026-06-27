import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset admin password",
  description: "Reset your admin account password",
};

export default function AdminForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
