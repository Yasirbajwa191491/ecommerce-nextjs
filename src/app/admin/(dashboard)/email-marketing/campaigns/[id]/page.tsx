"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmailPreview } from "@/components/admin/email-marketing/email-preview";
import { ProductPromoPreview } from "@/components/admin/email-marketing/product-promo-preview";
import { SendConfirmationDialog } from "@/components/admin/email-marketing/send-confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { calculateFinalPrice } from "@/lib/pricing";

export default function EmailCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const campaignId = id as Id<"emailCampaigns">;

  const detail = useQuery(api.emailCampaigns.getDetail, { id: campaignId });
  const subscriberCounts = useQuery(api.subscribers.countByStatus);
  const startSend = useMutation(api.emailCampaigns.startCampaignSend);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await startSend({ id: campaignId });
      toastSuccess("Campaign sending started", {
        description: `Queued for ${result.recipientCount} recipients.`,
      });
      setConfirmOpen(false);
    } catch (error) {
      toastError(error, { title: "Send failed" });
    } finally {
      setSending(false);
    }
  };

  if (detail === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (detail === null) {
    return <p className="text-muted-foreground">Campaign not found.</p>;
  }

  const { campaign, products } = detail;

  const estimatedRecipients =
    campaign.recipientCount > 0
      ? campaign.recipientCount
      : campaign.segmentType === "selected"
        ? (campaign.selectedSubscriberIds?.length ?? 0)
        : campaign.segmentType === "segments"
          ? 0
          : (subscriberCounts?.subscribed ?? 0);
  const promoProducts = products.map((p) => ({
    _id: p._id,
    name: p.name,
    imageUrl: p.image[0]?.url ?? "",
    price: p.price,
    discountedPrice: calculateFinalPrice(p.price, p.discountPercent ?? 0),
    discountPercent: p.discountPercent ?? 0,
    currency: p.currency ?? "USD",
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={campaign.name}
        description={campaign.subject}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            {campaign.status === "draft" ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() =>
                    router.push(
                      `/admin/email-marketing/campaigns/create?edit=${campaignId}`
                    )
                  }
                >
                  Edit Draft
                </Button>
                <Button onClick={() => setConfirmOpen(true)}>Send Campaign</Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{campaign.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Recipients</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {campaign.recipientCount}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sent Date</CardTitle>
          </CardHeader>
          <CardContent>
            {campaign.sentAt
              ? format(campaign.sentAt, "MMM d, yyyy HH:mm")
              : "Not sent"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sent By</CardTitle>
          </CardHeader>
          <CardContent>{campaign.sentByName ?? "—"}</CardContent>
        </Card>
      </div>

      {promoProducts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Attached Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductPromoPreview
              products={promoProducts}
              productPromoText={campaign.productPromoText}
              ctaText={campaign.ctaText}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailPreview html={campaign.contentHtml ?? ""} />
        </CardContent>
      </Card>

      <SendConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        campaignName={campaign.name}
        subject={campaign.subject}
        recipientCount={estimatedRecipients}
        productCount={campaign.productCount}
        onConfirm={handleSend}
        loading={sending}
      />
    </div>
  );
}
