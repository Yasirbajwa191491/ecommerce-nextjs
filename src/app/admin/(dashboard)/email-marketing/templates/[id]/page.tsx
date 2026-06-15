"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminFormField } from "@/components/admin/admin-form-field";
import { EmailRichTextEditor } from "@/components/admin/email-marketing/email-rich-text-editor";
import { EmailPreview } from "@/components/admin/email-marketing/email-preview";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EMPTY_TIPTAP_DOC } from "@/lib/email-marketing/tiptap-html";
import { toastError, toastSuccess } from "@/lib/app-toast";

export default function EmailTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = id as Id<"emailTemplates">;

  const template = useQuery(api.emailTemplates.getById, { id: templateId });
  const update = useMutation(api.emailTemplates.update);

  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [productPromoText, setProductPromoText] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
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
    if (!template) return;
    setName(template.name);
    setSubject(template.subject);
    setHeadline(template.headline ?? "");
    setPreviewText(template.previewText ?? "");
    setCtaText(template.ctaText ?? "");
    setProductPromoText(template.productPromoText ?? "");
    setStatus(template.status);
    setContentJson(template.contentJson || EMPTY_TIPTAP_DOC);
    setContentHtml(template.contentHtml);
    setProductIds(template.productIds ?? []);
  }, [template]);

  useEffect(() => {
    if (!aiProducts || aiProducts.length === 0) return;
    if (selectedProducts.length === 0 && productIds.length > 0) {
      setSelectedProducts(aiProducts);
    }
  }, [aiProducts, productIds.length, selectedProducts.length]);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toastError("Name and subject are required.");
      return;
    }
    setSaving(true);
    try {
      await update({
        id: templateId,
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
      toastSuccess("Template updated");
      setEditing(false);
    } catch (error) {
      toastError(error, { title: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  if (template === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (template === null) {
    return <p className="text-muted-foreground">Template not found.</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={editing ? "Edit Template" : template.name}
        description={template.subject}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            {editing ? (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            ) : (
              <Button onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>
        }
      />

      {editing ? (
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
      ) : null}

      <div className={editing ? "grid gap-6 lg:grid-cols-2" : "space-y-6"}>
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminFormField label="Template Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!editing}
              />
            </AdminFormField>
            {editing ? (
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
            ) : (
              <>
                <AdminFormField label="Email Subject">
                  <Input value={subject} disabled />
                </AdminFormField>
                {template.headline ? (
                  <AdminFormField label="Headline">
                    <Input value={template.headline} disabled />
                  </AdminFormField>
                ) : null}
              </>
            )}
            <AdminFormField label="Status">
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
                disabled={!editing}
              >
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
            {editing ? (
              <>
                <AdminFormField label="Placeholders">
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
              </>
            ) : (
              <AdminFormField label="Content">
                <EmailPreview html={contentHtml} />
              </AdminFormField>
            )}
          </CardContent>
        </Card>

        {editing ? (
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
        ) : null}
      </div>
    </div>
  );
}
