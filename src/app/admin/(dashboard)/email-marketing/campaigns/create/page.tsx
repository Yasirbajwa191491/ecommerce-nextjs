"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminFormField } from "@/components/admin/admin-form-field";
import { EmailRichTextEditor } from "@/components/admin/email-marketing/email-rich-text-editor";
import { PlaceholderReference } from "@/components/admin/email-marketing/placeholder-reference";
import { ProductPicker } from "@/components/admin/email-marketing/product-picker";
import { ProductPromoPreview, type PromoProduct } from "@/components/admin/email-marketing/product-promo-preview";
import { SubscriberPicker } from "@/components/admin/email-marketing/subscriber-picker";
import { SendConfirmationDialog } from "@/components/admin/email-marketing/send-confirmation-dialog";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  const templates = useQuery(api.emailTemplates.listForSelect);
  const subscriberCounts = useQuery(api.subscribers.countByStatus);

  const create = useMutation(api.emailCampaigns.create);
  const startSend = useMutation(api.emailCampaigns.startCampaignSend);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [templateId, setTemplateId] = useState<string>("none");
  const [contentJson, setContentJson] = useState(EMPTY_TIPTAP_DOC);
  const [contentHtml, setContentHtml] = useState("");
  const [productIds, setProductIds] = useState<Id<"products">[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<PromoProduct[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState<Id<"subscribers">[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const templateDetail = useQuery(
    api.emailTemplates.getById,
    templateId !== "none" ? { id: templateId as Id<"emailTemplates"> } : "skip"
  );

  useEffect(() => {
    if (!templateDetail) return;
    setSubject(templateDetail.subject);
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

  const segmentType = sendToAll ? ("all" as const) : ("selected" as const);

  const recipientCount = sendToAll
    ? (subscriberCounts?.subscribed ?? 0)
    : selectedSubscriberIds.length;

  const buildCampaignArgs = () => ({
    name: name.trim(),
    subject: subject.trim(),
    templateId:
      templateId !== "none" ? (templateId as Id<"emailTemplates">) : undefined,
    contentJson,
    contentHtml,
    productIds: productIds.length > 0 ? productIds : undefined,
    segmentType,
    selectedSubscriberIds:
      segmentType === "selected" ? selectedSubscriberIds : undefined,
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
    if (!sendToAll && selectedSubscriberIds.length === 0) {
      toastError("Select at least one subscriber.");
      return false;
    }
    if (recipientCount === 0) {
      toastError("No recipients selected.");
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const id = await create(buildCampaignArgs());
      toastSuccess("Campaign saved as draft");
      router.push(`/admin/email-marketing/campaigns/${id}`);
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
      const id = await create(buildCampaignArgs());
      await startSend({ id });
      toastSuccess("Campaign sending started", {
        description: `Queued for ${recipientCount} recipients.`,
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
        title="Create Campaign"
        description="Build a promotional or content-only email and send it to your subscribers."
      />

      <Card>
        <CardHeader>
          <CardTitle>Campaign Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <AdminFormField label="Campaign Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </AdminFormField>
          <AdminFormField label="Email Subject" required>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </AdminFormField>
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
              <ProductPromoPreview products={selectedProducts} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscriber Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="send-to-all"
                  checked={sendToAll}
                  onCheckedChange={(checked) => setSendToAll(checked === true)}
                />
                <Label htmlFor="send-to-all">Send to all subscribers</Label>
              </div>

              <AdminFormField label="Subscriber Segments">
                <Select value="all" disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="new" disabled>
                      New Subscribers (Coming soon)
                    </SelectItem>
                    <SelectItem value="customers" disabled>
                      Active Customers (Coming soon)
                    </SelectItem>
                    <SelectItem value="custom" disabled>
                      Custom Segments (Coming soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </AdminFormField>

              <SubscriberPicker
                selectedIds={selectedSubscriberIds}
                onChange={setSelectedSubscriberIds}
                disabled={sendToAll}
              />
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
        recipientCount={recipientCount}
        productCount={productIds.length}
        onConfirm={handleSend}
        loading={saving}
      />
    </div>
  );
}
