"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminFormField } from "@/components/admin/admin-form-field";
import { EmailRichTextEditor } from "@/components/admin/email-marketing/email-rich-text-editor";
import { PlaceholderReference } from "@/components/admin/email-marketing/placeholder-reference";
import { ProductPicker } from "@/components/admin/email-marketing/product-picker";
import { ProductPromoPreview, type PromoProduct } from "@/components/admin/email-marketing/product-promo-preview";
import { SendConfirmationDialog } from "@/components/admin/email-marketing/send-confirmation-dialog";
import { EmailMarketingAiAssistant } from "@/components/admin/email-marketing/email-marketing-ai-assistant";
import { EmailContentExtraFields } from "@/components/admin/email-marketing/email-content-extra-fields";
import {
  SegmentSelector,
  audienceToCampaignSegment,
  campaignSegmentToAudience,
  type SegmentSelectorValue,
} from "@/components/admin/email-marketing/segment-selector";
import { serializeSegmentCriteria } from "@/lib/email-marketing/segment-utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPTY_TIPTAP_DOC } from "@/lib/email-marketing/tiptap-html";
import { toastError, toastSuccess } from "@/lib/app-toast";

export default function CreateEmailCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") as Id<"emailCampaigns"> | null;

  const templates = useQuery(api.emailTemplates.listForSelect);
  const subscriberCounts = useQuery(api.subscribers.countByStatus);
  const existingCampaign = useQuery(
    api.emailCampaigns.getById,
    editId ? { id: editId } : "skip"
  );

  const create = useMutation(api.emailCampaigns.create);
  const update = useMutation(api.emailCampaigns.update);
  const startSend = useMutation(api.emailCampaigns.startCampaignSend);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [productPromoText, setProductPromoText] = useState("");
  const [templateId, setTemplateId] = useState<string>("none");
  const [contentJson, setContentJson] = useState(EMPTY_TIPTAP_DOC);
  const [contentHtml, setContentHtml] = useState("");
  const [productIds, setProductIds] = useState<Id<"products">[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<PromoProduct[]>([]);
  const [audience, setAudience] = useState<SegmentSelectorValue>({
    mode: "all",
    segmentKeys: [],
    selectedSubscriberIds: [],
  });
  const [suggestedSegmentKeys, setSuggestedSegmentKeys] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedEditId, setLoadedEditId] = useState<string | null>(null);

  const aiProductIds =
    productIds.length > 0 ? { ids: productIds } : ("skip" as const);
  const aiProducts = useQuery(api.products.getPromoProductsByIds, aiProductIds);

  useEffect(() => {
    if (!aiProducts || aiProducts.length === 0) return;
    setSelectedProducts(aiProducts);
  }, [aiProducts]);

  useEffect(() => {
    if (!existingCampaign || !editId || loadedEditId === editId) return;
    if (existingCampaign.status !== "draft") return;
    setName(existingCampaign.name);
    setSubject(existingCampaign.subject);
    setHeadline(existingCampaign.headline ?? "");
    setPreviewText(existingCampaign.previewText ?? "");
    setCtaText(existingCampaign.ctaText ?? "");
    setProductPromoText(existingCampaign.productPromoText ?? "");
    setContentJson(existingCampaign.contentJson || EMPTY_TIPTAP_DOC);
    setContentHtml(existingCampaign.contentHtml ?? "");
    setProductIds(existingCampaign.productIds ?? []);
    setTemplateId(existingCampaign.templateId ?? "none");
    setAudience(
      campaignSegmentToAudience(
        existingCampaign.segmentType,
        existingCampaign.segmentCriteria,
        existingCampaign.selectedSubscriberIds
      )
    );
    setLoadedEditId(editId);
  }, [existingCampaign, editId, loadedEditId]);

  const templateDetail = useQuery(
    api.emailTemplates.getById,
    templateId !== "none" ? { id: templateId as Id<"emailTemplates"> } : "skip"
  );

  useEffect(() => {
    if (!templateDetail || editId) return;
    setSubject(templateDetail.subject);
    setHeadline(templateDetail.headline ?? "");
    setPreviewText(templateDetail.previewText ?? "");
    setCtaText(templateDetail.ctaText ?? "");
    setProductPromoText(templateDetail.productPromoText ?? "");
    setContentJson(templateDetail.contentJson || EMPTY_TIPTAP_DOC);
    setContentHtml(templateDetail.contentHtml);
    setProductIds(templateDetail.productIds ?? []);
    setSelectedProducts([]);
  }, [templateDetail]);

  const selectedTemplateLabel =
    templateId === "none"
      ? "No template (custom content)"
      : (templates?.find((t) => t._id === templateId)?.name ??
        templateDetail?.name ??
        "Choose a template");

  const segmentArgs = audienceToCampaignSegment(audience);

  const segmentRecipientCount = useQuery(
    api.subscriberInterests.countRecipientsForSegments,
    audience.mode === "segments" && audience.segmentKeys.length > 0
      ? { segmentKeys: audience.segmentKeys }
      : "skip"
  );

  const effectiveRecipientCount =
    audience.mode === "all"
      ? (subscriberCounts?.subscribed ?? 0)
      : audience.mode === "segments"
        ? (segmentRecipientCount ?? 0)
        : audience.selectedSubscriberIds.length;

  const buildCampaignArgs = () => ({
    name: name.trim(),
    subject: subject.trim(),
    headline: headline.trim() || undefined,
    previewText: previewText.trim() || undefined,
    ctaText: ctaText.trim() || undefined,
    productPromoText: productPromoText.trim() || undefined,
    suggestedSegmentKeys:
      suggestedSegmentKeys.length > 0
        ? serializeSegmentCriteria(suggestedSegmentKeys)
        : undefined,
    templateId:
      templateId !== "none" ? (templateId as Id<"emailTemplates">) : undefined,
    contentJson,
    contentHtml,
    productIds: productIds.length > 0 ? productIds : undefined,
    ...segmentArgs,
  });

  const validate = () => {
    if (!name.trim()) {
      toastError("Campaign name is required.");
      return false;
    }
    if (!subject.trim()) {
      toastError("Email subject is required.");
      return false;
    }
    if (!contentHtml.trim()) {
      toastError("Email content is required.");
      return false;
    }
    if (audience.mode === "selected" && audience.selectedSubscriberIds.length === 0) {
      toastError("Select at least one subscriber.");
      return false;
    }
    if (audience.mode === "segments" && audience.segmentKeys.length === 0) {
      toastError("Select at least one segment.");
      return false;
    }
    if (effectiveRecipientCount === 0) {
      toastError("No recipients selected.");
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const args = buildCampaignArgs();
      if (editId && existingCampaign?.status === "draft") {
        await update({ id: editId, ...args });
        toastSuccess("Campaign updated");
        router.push(`/admin/email-marketing/campaigns/${editId}`);
      } else {
        const id = await create(args);
        toastSuccess("Campaign saved as draft");
        router.push(`/admin/email-marketing/campaigns/${id}`);
      }
    } catch (error) {
      toastError(error, { title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let id = editId;
      const args = buildCampaignArgs();
      if (editId && existingCampaign?.status === "draft") {
        await update({ id: editId, ...args });
      } else {
        id = await create(args);
      }
      if (!id) throw new Error("Campaign ID missing");
      await startSend({ id });
      toastSuccess("Campaign sending started", {
        description: `Queued for ${effectiveRecipientCount} recipients.`,
      });
      setConfirmOpen(false);
      router.push(`/admin/email-marketing/campaigns/${id}`);
    } catch (error) {
      toastError(error, { title: "Send failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={editId ? "Edit Campaign" : "Create Campaign"}
        description="Build a promotional or content-only email and send it to your subscribers."
      />

      <EmailMarketingAiAssistant
        mode="campaign"
        campaignName={name}
        onApply={(payload) => {
          if (payload.name) setName(payload.name);
          setSubject(payload.subject);
          setHeadline(payload.headline);
          setPreviewText(payload.previewText);
          setCtaText(payload.ctaText);
          setProductPromoText(payload.productPromoText);
          setContentJson(payload.contentJson);
          setContentHtml(payload.contentHtml);
          setProductIds(payload.productIds);
          setSuggestedSegmentKeys(payload.suggestedSegmentKeys);
          if (payload.audience) setAudience(payload.audience);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <AdminFormField label="Campaign Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </AdminFormField>
          <div className="sm:col-span-2">
            <EmailContentExtraFields
              subject={subject}
              onSubjectChange={setSubject}
              headline={headline}
              onHeadlineChange={setHeadline}
              previewText={previewText}
              onPreviewTextChange={setPreviewText}
              ctaText={ctaText}
              onCtaTextChange={setCtaText}
              productPromoText={productPromoText}
              onProductPromoTextChange={setProductPromoText}
              campaignName={name}
            />
          </div>
          <AdminFormField label="Select Template" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Select
                value={templateId}
                onValueChange={(value) => setTemplateId(value ?? "none")}
              >
                <SelectTrigger className="min-w-[240px]">
                  <SelectValue placeholder="Choose a template">
                    {selectedTemplateLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template (custom content)</SelectItem>
                  {templates?.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ButtonLink
                variant="outline"
                size="sm"
                href="/admin/email-marketing/templates/create"
              >
                Create New Template
              </ButtonLink>
            </div>
          </AdminFormField>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlaceholderReference />
            <EmailRichTextEditor
              contentJson={contentJson}
              onChange={(json, html) => {
                setContentJson(json);
                setContentHtml(html);
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Promotion (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductPicker
                selectedIds={productIds}
                onChange={(ids, products) => {
                  setProductIds(ids);
                  setSelectedProducts(products);
                }}
              />
              <ProductPromoPreview
                products={selectedProducts.length > 0 ? selectedProducts : (aiProducts ?? [])}
                productPromoText={productPromoText}
                ctaText={ctaText}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscriber Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <SegmentSelector value={audience} onChange={setAudience} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={handleSaveDraft} disabled={saving}>
          Save as Draft
        </Button>
        <Button onClick={() => validate() && setConfirmOpen(true)} disabled={saving}>
          Send Campaign
        </Button>
      </div>

      <SendConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        campaignName={name}
        subject={subject}
        recipientCount={effectiveRecipientCount}
        productCount={productIds.length}
        onConfirm={handleSend}
        loading={saving}
      />
    </div>
  );
}
