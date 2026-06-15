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
import { EmailMarketingAiAssistant } from "@/components/admin/email-marketing/email-marketing-ai-assistant";
import { EmailContentExtraFields } from "@/components/admin/email-marketing/email-content-extra-fields";
import { Button } from "@/components/ui/button";
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

export default function CreateEmailTemplatePage() {
  const router = useRouter();
  const create = useMutation(api.emailTemplates.create);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [productPromoText, setProductPromoText] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("active");
  const [contentJson, setContentJson] = useState(EMPTY_TIPTAP_DOC);
  const [contentHtml, setContentHtml] = useState("");
  const [productIds, setProductIds] = useState<Id<"products">[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<PromoProduct[]>([]);
  const [saving, setSaving] = useState(false);

  const aiProducts = useQuery(
    api.products.getPromoProductsByIds,
    productIds.length > 0 ? { ids: productIds } : "skip"
  );

  useEffect(() => {
    if (!aiProducts || aiProducts.length === 0) return;
    setSelectedProducts(aiProducts);
  }, [aiProducts]);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toastError("Name and subject are required.");
      return;
    }
    setSaving(true);
    try {
      const id = await create({
        name: name.trim(),
        subject: subject.trim(),
        headline: headline.trim() || undefined,
        previewText: previewText.trim() || undefined,
        ctaText: ctaText.trim() || undefined,
        productPromoText: productPromoText.trim() || undefined,
        contentJson,
        contentHtml,
        status,
        productIds: productIds.length > 0 ? productIds : undefined,
      });
      toastSuccess("Template created");
      router.push(`/admin/email-marketing/templates/${id}`);
    } catch (error) {
      toastError(error, { title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Create Template"
        description="Design a reusable email template with rich content and optional product sections."
      />

      <EmailMarketingAiAssistant
        mode="template"
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
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminFormField label="Template Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </AdminFormField>
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
            <AdminFormField label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </AdminFormField>
            <AdminFormField label="Placeholders" description="Click to copy into your content.">
              <PlaceholderReference />
            </AdminFormField>
            <AdminFormField label="Email Content" required>
              <EmailRichTextEditor
                contentJson={contentJson}
                onChange={(json, html) => {
                  setContentJson(json);
                  setContentHtml(html);
                }}
              />
            </AdminFormField>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Section (Optional)</CardTitle>
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

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
