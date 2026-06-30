"use client";

import { useParams } from "next/navigation";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { ProductFormFields, ProductFormSidebarFlags } from "@/components/admin/product-form/product-form";
import { ProductFormLayout } from "@/components/admin/product-form/product-form-layout";
import { useProductForm } from "@/hooks/use-product-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditProductPage() {
  const params = useParams();
  const productId = params.id as Id<"products">;

  const formState = useProductForm({ productId });

  if (formState.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const fieldProps = {
    form: formState.form,
    setForm: formState.setForm,
    validation: formState.validation,
    categoryOptions: formState.categoryOptions,
    product: formState.product,
    onApplyAiContent: formState.applyAiContent,
    aiContentProvider: formState.aiContentProvider,
    onAiContentProviderChange: formState.setAiContentProvider,
  };

  const productName = formState.form.name.trim() || "Edit product";

  return (
    <ProductFormLayout
      title={`Edit ${productName}`}
      description="Update product details, images, pricing, and promotions."
      breadcrumbItems={[
        { label: "Products", href: "/admin/products" },
        { label: productName },
      ]}
      saving={formState.saving}
      onSave={() => void formState.save()}
      onSaveAndContinue={() => void formState.save({ stayOnPage: true })}
      onCancel={formState.handleCancel}
      onBack={formState.handleCancel}
      discardOpen={formState.discardOpen}
      onDiscardConfirm={formState.confirmDiscard}
      onDiscardCancel={formState.cancelDiscard}
      sidebar={<ProductFormSidebarFlags {...fieldProps} />}
    >
      <ProductFormFields {...fieldProps} />
    </ProductFormLayout>
  );
}
