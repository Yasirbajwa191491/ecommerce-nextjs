"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminFormField } from "@/components/admin/admin-form-field";
import { EmailRichTextEditor } from "@/components/admin/email-marketing/email-rich-text-editor";
import { PlaceholderReference } from "@/components/admin/email-marketing/placeholder-reference";
import { ProductPicker } from "@/components/admin/email-marketing/product-picker";
import { ProductPromoPreview, type PromoProduct } from "@/components/admin/email-marketing/product-promo-preview";
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
  const [status, setStatus] = useState<"draft" | "active" | "archived">("active");
  const [contentJson, setContentJson] = useState(EMPTY_TIPTAP_DOC);
  const [contentHtml, setContentHtml] = useState("");
  const [productIds, setProductIds] = useState<Id<"products">[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<PromoProduct[]>([]);
  const [saving, setSaving] = useState(false);

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminFormField label="Template Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </AdminFormField>
            <AdminFormField label="Email Subject" required>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </AdminFormField>
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
              <ProductPromoPreview products={selectedProducts} />
            </CardContent>
          </Card>

        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>
    </div>
  );
}
