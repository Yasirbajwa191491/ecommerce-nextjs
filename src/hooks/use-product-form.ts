"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ProductAiApplyPayload } from "@/components/admin/product-form-ai-section";
import {
  readProductAiProvider,
  writeProductAiProvider,
  type ProductAiContentProvider,
} from "@/lib/product-ai-provider";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  emptyForm,
  formToPayload,
  productToForm,
  applySavedImagesToForm,
  serializeProductForm,
  type ProductForm,
} from "@/lib/product-form-state";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { validateProductForm } from "@/lib/validation/admin-forms";
import type { Product, ProductCategory } from "@/types/product";

type UseProductFormOptions = {
  productId?: Id<"products">;
  defaultCategoryId?: string;
  onSaved?: (productId: Id<"products">) => void;
};

const EMPTY_CATEGORIES: ProductCategory[] = [];

export function useProductForm({
  productId,
  defaultCategoryId,
  onSaved,
}: UseProductFormOptions) {
  const router = useRouter();
  const isEdit = Boolean(productId);

  const product = useQuery(
    api.products.getById,
    productId ? { id: productId } : "skip"
  );
  const categoriesData = useQuery(api.productCategories.listActive);
  const categories = categoriesData ?? EMPTY_CATEGORIES;
  const takenNames = useQuery(
    api.products.listTakenNames,
    productId ? { excludeId: productId } : {}
  );

  const create = useMutation(api.products.create);
  const update = useMutation(api.products.update);

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [initialSnapshot, setInitialSnapshot] = useState(serializeProductForm(emptyForm()));
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiContentProvider, setAiContentProviderState] =
    useState<ProductAiContentProvider>("gemini");

  useEffect(() => {
    setAiContentProviderState(readProductAiProvider());
  }, []);

  const setAiContentProvider = useCallback(
    (provider: ProductAiContentProvider) => {
      setAiContentProviderState(provider);
      writeProductAiProvider(provider);
    },
    []
  );

  const loadKey = productId ?? `new:${defaultCategoryId ?? ""}`;

  useEffect(() => {
    if (loadedKey === loadKey) return;

    if (productId) {
      if (product === undefined) return;
      if (!product) {
        toastError("Product not found");
        router.replace("/admin/products");
        return;
      }
      const next = productToForm(product as Product);
      setForm(next);
      setInitialSnapshot(serializeProductForm(next));
      setLoadedKey(loadKey);
      return;
    }

    const next = emptyForm();
    if (defaultCategoryId) next.categoryId = defaultCategoryId;
    else if (categories[0]) next.categoryId = categories[0]._id;
    setForm(next);
    setInitialSnapshot(serializeProductForm(next));
    setLoadedKey(loadKey);
  }, [productId, product, categories, defaultCategoryId, loadKey, loadedKey, router]);

  const categoryOptions = useMemo(() => {
    const map = new Map(categories.map((c) => [c._id, c]));
    const editing = product as Product | null | undefined;
    if (
      editing?.category &&
      editing.categoryId &&
      !map.has(editing.categoryId)
    ) {
      map.set(editing.categoryId, {
        _id: editing.categoryId,
        name: editing.category.name,
        slug: editing.category.slug,
        description: "",
        active: true,
        sortOrder: 0,
      } as ProductCategory);
    }
    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, product]);

  const validate = useCallback(
    (values: ProductForm) =>
      validateProductForm(values, { takenNames: takenNames ?? [] }),
    [takenNames]
  );
  const validation = useFormValidation(form, validate);

  const isDirty = serializeProductForm(form) !== initialSnapshot;
  const {
    discardOpen,
    requestNavigation,
    confirmDiscard,
    cancelDiscard,
  } = useUnsavedChangesGuard({ isDirty });

  const applyAiContent = useCallback((payload: ProductAiApplyPayload) => {
    setForm((current) => {
      const next = { ...current };
      if (payload.description !== undefined) next.description = payload.description;
      if (payload.seoTitle !== undefined) next.seoTitle = payload.seoTitle;
      if (payload.seoDescription !== undefined) {
        next.seoDescription = payload.seoDescription;
      }
      if (payload.seoKeywords !== undefined) next.seoKeywords = payload.seoKeywords;
      if (payload.highlights !== undefined) {
        next.highlights = payload.highlights.length ? payload.highlights : [""];
      }
      if (payload.imageAlts !== undefined) {
        let altIdx = 0;
        next.imageAlts = current.imageUrls.map((url) => {
          if (!url.trim()) return "";
          const alt = payload.imageAlts?.[altIdx] ?? "";
          altIdx += 1;
          return alt;
        });
      }
      return next;
    });
    if (payload.description !== undefined) validation.touch("description");
    if (payload.seoTitle !== undefined) validation.touch("seoTitle");
    if (payload.seoDescription !== undefined) validation.touch("seoDescription");
    if (payload.seoKeywords !== undefined) validation.touch("seoKeywords");
    if (payload.highlights !== undefined) validation.touch("highlights");
  }, [validation]);

  const save = useCallback(
    async (options?: { stayOnPage?: boolean }) => {
      if (!validation.validateAll()) return false;
      setSaving(true);
      try {
        const payload = formToPayload(form);
        if (productId) {
          await update({ id: productId, ...payload });
          toastSuccess("Product updated");
          const savedForm = applySavedImagesToForm(form, payload);
          setForm(savedForm);
          setInitialSnapshot(serializeProductForm(savedForm));
          setLoadedKey("");
          onSaved?.(productId);
          if (!options?.stayOnPage) {
            router.push("/admin/products");
          }
          return true;
        }
        const id = await create(payload);
        toastSuccess("Product created");
        onSaved?.(id);
        if (options?.stayOnPage) {
          router.replace(`/admin/products/${id}/edit`);
          return true;
        }
        router.push("/admin/products");
        return true;
      } catch (e) {
        toastError(e, {
          title: "Couldn't save product",
          fallback: "Failed to save product. Please try again.",
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [validation, form, productId, update, create, router, onSaved]
  );

  const handleCancel = useCallback(() => {
    requestNavigation(() => router.push("/admin/products"));
  }, [requestNavigation, router]);

  const isLoading =
    productId ? product === undefined : categoriesData === undefined;

  return {
    isEdit,
    isLoading,
    form,
    setForm,
    validation,
    categoryOptions,
    product: product as Product | null | undefined,
    saving,
    isDirty,
    save,
    applyAiContent,
    aiContentProvider,
    setAiContentProvider,
    handleCancel,
    discardOpen,
    confirmDiscard,
    cancelDiscard,
    requestNavigation,
  };
}
