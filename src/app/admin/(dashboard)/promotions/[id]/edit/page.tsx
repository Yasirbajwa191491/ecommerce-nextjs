"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../../../convex/_generated/dataModel";
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb";
import { AdminStickyFooter } from "@/components/admin/admin-sticky-footer";
import { PromotionAnalyticsCards } from "@/components/admin/promotions/promotion-analytics-cards";
import {
  PromotionForm,
  emptyPromotionForm,
  promotionFormToPayload,
  type PromotionFormState,
} from "@/components/admin/promotions/promotion-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormValidation } from "@/hooks/use-form-validation";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { validatePromotionForm } from "@/lib/validation/promotion-form";
import { toDatetimeLocalValue } from "@/lib/promotion-datetime";
import { ArrowLeft } from "lucide-react";

function promotionToForm(promotion: Doc<"productPromotions">): PromotionFormState {
  return {
    type: promotion.type,
    name: promotion.name,
    description: promotion.description ?? "",
    promotionMessage: promotion.promotionMessage ?? "",
    bannerText: promotion.bannerText ?? "",
    buyProductId: promotion.buyProductId,
    buyProductName: "",
    buyQuantity: promotion.buyQuantity,
    getProductId: promotion.getProductId ?? "",
    getProductName: "",
    getQuantity: promotion.getQuantity,
    startAt: toDatetimeLocalValue(promotion.startAt),
    endAt: toDatetimeLocalValue(promotion.endAt),
    status: promotion.status,
  };
}

export default function EditPromotionPage() {
  const params = useParams();
  const router = useRouter();
  const promotionId = params.id as Id<"productPromotions">;
  const detail = useQuery(api.productPromotions.getById, { id: promotionId });
  const update = useMutation(api.productPromotions.update);
  const [form, setForm] = useState<PromotionFormState>(emptyPromotionForm);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const validation = useFormValidation(form, validatePromotionForm);

  useEffect(() => {
    if (!detail || loaded) return;
    const next = promotionToForm(detail.promotion);
    next.buyProductName = detail.buyProduct?.name ?? "";
    next.getProductName = detail.getProduct?.name ?? "";
    setForm(next);
    setLoaded(true);
  }, [detail, loaded]);

  const handleSave = async () => {
    if (!validation.validateAll()) return;

    setSaving(true);
    try {
      const payload = promotionFormToPayload(form);
      await update({ id: promotionId, ...payload });
      toastSuccess("Promotion updated");
      router.push("/admin/promotions");
    } catch (e) {
      toastError(e, { title: "Couldn't update promotion" });
    } finally {
      setSaving(false);
    }
  };

  if (detail === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (detail === null) {
    return <p className="text-muted-foreground">Promotion not found.</p>;
  }

  return (
    <div className="pb-24">
      <ButtonLink variant="ghost" size="sm" className="-ml-2 mb-4 gap-1" href="/admin/promotions">
        <ArrowLeft className="size-4" />
        Back to Promotions
      </ButtonLink>
      <AdminBreadcrumb
        items={[
          { label: "Promotions", href: "/admin/promotions" },
          { label: detail.promotion.name },
        ]}
      />
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Edit promotion</h1>

      <div className="mt-6 space-y-6">
        <PromotionAnalyticsCards
          viewCount={detail.promotion.viewCount}
          clickCount={detail.promotion.clickCount}
          conversionCount={detail.promotion.conversionCount}
          ordersCount={detail.promotion.ordersCount}
          revenueGenerated={detail.promotion.revenueGenerated}
          freeProductsGiven={detail.promotion.freeProductsGiven}
        />
        <div>
          <PromotionForm form={form} setForm={setForm} validation={validation} />
        </div>
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
          {saving ? "Saving…" : "Save promotion"}
        </Button>
      </AdminStickyFooter>
    </div>
  );
}
