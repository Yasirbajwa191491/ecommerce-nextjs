import { EmailMarketingNav } from "@/components/admin/email-marketing/email-marketing-nav";

export default function EmailMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <EmailMarketingNav />
      {children}
    </div>
  );
}
