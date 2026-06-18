"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { ProductFormFields, ProductFormSidebarFlags } from "@/components/admin/product-form/product-form";
import { ProductFormLayout } from "@/components/admin/product-form/product-form-layout";
import { useProductForm } from "@/hooks/use-product-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewProductPage() {
  const categories = useQuery(api.productCategories.listActive);
  const defaultCategoryId = categories?.[0]?._id;

  const formState = useProductForm({ defaultCategoryId });

  if (formState.isLoading || categories === undefined) {
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
  };

  return (
    <ProductFormLayout
      title="New product"
      description="Add a new item to your store catalog."
      breadcrumbItems={[
        { label: "Products", href: "/admin/products" },
        { label: "New product" },
      ]}
      saving={formState.saving}
      saveLabel="Create product"
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
