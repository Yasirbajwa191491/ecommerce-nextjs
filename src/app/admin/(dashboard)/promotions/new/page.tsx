"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminStickyFooter } from "@/components/admin/admin-sticky-footer";
import {
  PromotionForm,
  emptyPromotionForm,
  promotionFormToPayload,
} from "@/components/admin/promotions/promotion-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { useFormValidation } from "@/hooks/use-form-validation";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { validatePromotionForm } from "@/lib/validation/promotion-form";
import { ArrowLeft } from "lucide-react";

export default function NewPromotionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buyProductId = searchParams.get("buyProductId") as Id<"products"> | null;
  const prefilledProduct = useQuery(
    api.products.getById,
    buyProductId ? { id: buyProductId } : "skip"
  );
  const create = useMutation(api.productPromotions.create);
  const [form, setForm] = useState(emptyPromotionForm);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const validation = useFormValidation(form, validatePromotionForm);

  useEffect(() => {
    if (!prefilledProduct || prefilled) return;
    setForm((f) => ({
      ...f,
      buyProductId: prefilledProduct._id,
      buyProductName: prefilledProduct.name,
      getProductId: f.type === "bogo" ? prefilledProduct._id : f.getProductId,
      getProductName:
        f.type === "bogo" ? prefilledProduct.name : f.getProductName,
    }));
    setPrefilled(true);
  }, [prefilledProduct, prefilled]);

  const handleSave = async () => {
    if (!validation.validateAll()) return;

    setSaving(true);
    try {
      const payload = promotionFormToPayload(form);
      await create(payload);
      toastSuccess("Promotion created");
      router.push("/admin/promotions");
    } catch (e) {
      toastError(e, { title: "Couldn't create promotion" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24">
      <ButtonLink variant="ghost" size="sm" className="-ml-2 mb-4 gap-1" href="/admin/promotions">
        <ArrowLeft className="size-4" />
        Back to Promotions
      </ButtonLink>
      <AdminBreadcrumb
        items={[
          { label: "Promotions", href: "/admin/promotions" },
          { label: "New promotion" },
        ]}
      />
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Create promotion</h1>
      <div className="mt-6">
        <PromotionForm form={form} setForm={setForm} validation={validation} />
      </div>
      <AdminStickyFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/promotions")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Create promotion"}
        </Button>
      </AdminStickyFooter>
    </div>
  );
}
