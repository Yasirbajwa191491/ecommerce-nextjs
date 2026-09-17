import { QrResolveView } from "@/components/qr/qr-resolve-view";
import { CONTENT_SECTION_PADDING_Y, PAGE_GUTTER } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type QrPageProps = {
  params: Promise<{ type: string; token: string }>;
};

export default async function QrPage({ params }: QrPageProps) {
  const { type, token } = await params;
  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <div className={cn(CONTENT_SECTION_PADDING_Y)} style={PAGE_GUTTER}>
        <QrResolveView type={type} token={token} source="web" />
      </div>
    </div>
  );
}
