"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminListToolbar,
  type StatusTab,
} from "@/components/admin/admin-list-toolbar";
import {
  AdminProductFilters,
  emptyProductFilters,
  toProductFilterArgs,
  type ProductListFilters,
} from "@/components/admin/admin-product-filters";
import { AdminTableCard } from "@/components/admin/admin-table-card";
import { AdminTableInfiniteScroll } from "@/components/admin/admin-table-infinite-scroll";
import { ColumnVisibilityPanel } from "@/components/admin/column-visibility-panel";
import {
  ProductColorSwatches,
  ProductImageThumbnails,
} from "@/components/admin/product-table-preview";
import { AdminProductReviewInsights } from "@/components/admin/admin-product-review-insights";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminFormField, invalidInputClass } from "@/components/admin/admin-form-field";
import { ColorInput } from "@/components/admin/color-input";
import { CurrencySelect } from "@/components/admin/currency-select";
import { ProductImageField } from "@/components/admin/product-image-field";
import {
  ProductFormAiSection,
  type ProductAiApplyPayload,
} from "@/components/admin/product-form-ai-section";
import { ProductFormAiPricingSection } from "@/components/admin/product-form-ai-pricing-section";
import { DEFAULT_CURRENCY, formatCurrencyAmount } from "@/lib/currencies";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { useFormValidation } from "@/hooks/use-form-validation";
import {
  PRODUCT_COLUMNS_STORAGE_KEY,
  PRODUCT_TABLE_COLUMNS,
} from "@/lib/admin/product-table-columns";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { validateProductForm, getProductFormWarnings } from "@/lib/validation/admin-forms";
import { cn } from "@/lib/utils";
import { GripVertical, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import type { Product, ProductCategory } from "@/types/product";

type ProductForm = {
  name: string;
  company: string;
  sku: string;
  price: number;
  currency: string;
  colors: string[];
  imageUrls: string[];
  categoryId: string;
  featured: boolean;
  shipping: boolean;
  discountPercent: number;
  shippingCharges: number;
  stock: number;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  highlights: string[];
  imageAlts: string[];
  active: boolean;
};

const emptyForm = (): ProductForm => ({
  name: "",
  company: "",
  sku: "",
  price: 0,
  currency: DEFAULT_CURRENCY,
  colors: [],
  imageUrls: [""],
  categoryId: "",
  featured: false,
  shipping: true,
  discountPercent: 0,
  shippingCharges: 0,
  stock: 0,
  description: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  highlights: [""],
  imageAlts: [""],
  active: true,
});

function isProductActive(product: Product) {
  return product.active !== false;
}

function productFlag(value: boolean | undefined | null) {
  return value === true;
}

const ADMIN_LIST_PAGE_SIZE = 10;

export default function AdminProductsPage() {
  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit");
  const maxStockParam = searchParams.get("maxStock");
  const deepLinkHandled = useRef(false);

  const categories = useQuery(api.productCategories.listActive) ?? [];
  const counts = useQuery(api.products.countByStatus);

  const [activeTab, setActiveTab] = useState<StatusTab>("active");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ProductListFilters>(() => {
    const initial = emptyProductFilters();
    if (maxStockParam && /^\d+$/.test(maxStockParam)) {
      initial.maxStock = maxStockParam;
    }
    return initial;
  });
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedId, setDraggedId] = useState<Id<"products"> | null>(null);

  const filterArgs = useMemo(() => toProductFilterArgs(filters), [filters]);

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPaginated,
    {
      active: activeTab === "active",
      search: search || undefined,
      ...filterArgs,
    },
    { initialNumItems: ADMIN_LIST_PAGE_SIZE }
  );
  const create = useMutation(api.products.create);
  const update = useMutation(api.products.update);
  const remove = useMutation(api.products.remove);
  const restore = useMutation(api.products.restore);
  const reorder = useMutation(api.products.reorder);
  const scheduleEmbeddingBackfill = useMutation(api.productAi.scheduleBackfill);

  const handleEmbeddingBackfill = async () => {
    try {
      await scheduleEmbeddingBackfill({});
      toastSuccess("Product AI embedding backfill scheduled.");
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Failed to schedule backfill"
      );
    }
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<Id<"products"> | null>(null);
  const [restoreId, setRestoreId] = useState<Id<"products"> | null>(null);
  const [saving, setSaving] = useState(false);

  const takenNames = useQuery(
    api.products.listTakenNames,
    editing ? { excludeId: editing._id } : {}
  );

  const deepLinkProduct = useQuery(
    api.products.getById,
    editParam ? { id: editParam as Id<"products"> } : "skip"
  );

  const categoryOptions = useMemo(() => {
    const map = new Map(categories.map((c) => [c._id, c]));
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
  }, [categories, editing]);

  const selectedCategory = categoryOptions.find((c) => c._id === form.categoryId);
  const seoWarnings = getProductFormWarnings(form);

  const validate = useCallback(
    (values: ProductForm) =>
      validateProductForm(values, { takenNames: takenNames ?? [] }),
    [takenNames]
  );
  const validation = useFormValidation(form, validate);
  const resetValidation = validation.reset;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (activeTab === "inactive") setReorderMode(false);
  }, [activeTab]);

  const closeProductDialog = useCallback(() => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
    resetValidation();
  }, [resetValidation]);

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setDialogOpen(true);
      return;
    }
    closeProductDialog();
  };

  const openCreate = () => {
    setEditing(null);
    const f = emptyForm();
    if (categories[0]) f.categoryId = categories[0]._id;
    setForm(f);
    resetValidation();
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      company: p.company,
      sku: p.sku ?? "",
      price: p.price,
      currency: p.currency ?? DEFAULT_CURRENCY,
      colors: [...p.colors],
      imageUrls: p.image.length ? p.image.map((i) => i.url) : [""],
      imageAlts: p.image.length
        ? p.image.map((i) => i.alt ?? "")
        : [""],
      categoryId: p.categoryId,
      featured: productFlag(p.featured),
      shipping: productFlag(p.shipping),
      discountPercent: p.discountPercent ?? 0,
      shippingCharges: p.shippingCharges ?? 0,
      stock: p.stock,
      description: p.description,
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      seoKeywords: p.seoKeywords?.join(", ") ?? "",
      highlights: p.highlights?.length ? [...p.highlights] : [""],
      active: isProductActive(p),
    });
    resetValidation();
    setDialogOpen(true);
  };

  useEffect(() => {
    if (deepLinkHandled.current || !editParam || deepLinkProduct === undefined) {
      return;
    }
    if (deepLinkProduct) {
      openEdit(deepLinkProduct as Product);
      deepLinkHandled.current = true;
    }
  }, [editParam, deepLinkProduct]);

  const toPayload = (f: ProductForm) => {
    const imagePairs = f.imageUrls
      .map((url, i) => ({
        url: url.trim(),
        alt: f.imageAlts[i]?.trim() || undefined,
      }))
      .filter((entry) => entry.url.length > 0);

    const keywords = f.seoKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const highlights = f.highlights.map((h) => h.trim()).filter(Boolean);

    return {
      name: f.name.trim(),
      company: f.company.trim(),
      sku: f.sku.trim() || undefined,
      price: Number(f.price),
      currency: f.currency.trim() || DEFAULT_CURRENCY,
      colors: f.colors.map((c) => c.trim()).filter(Boolean),
      image: imagePairs.map(({ url, alt }) => ({ url, alt })),
      categoryId: f.categoryId as Id<"productCategories">,
      featured: f.featured,
      shipping: f.shipping,
      discountPercent: Number(f.discountPercent) || 0,
      shippingCharges: f.shipping ? 0 : Number(f.shippingCharges) || 0,
      stock: Number(f.stock),
      description: f.description.trim(),
      seoTitle: f.seoTitle.trim() || undefined,
      seoDescription: f.seoDescription.trim() || undefined,
      seoKeywords: keywords.length ? keywords : undefined,
      highlights: highlights.length ? highlights : undefined,
      active: f.active,
    };
  };

  const applyAiContent = (payload: ProductAiApplyPayload) => {
    setForm((current) => {
      const next = { ...current };
      if (payload.description !== undefined) {
        next.description = payload.description;
      }
      if (payload.seoTitle !== undefined) {
        next.seoTitle = payload.seoTitle;
      }
      if (payload.seoDescription !== undefined) {
        next.seoDescription = payload.seoDescription;
      }
      if (payload.seoKeywords !== undefined) {
        next.seoKeywords = payload.seoKeywords;
      }
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
  };

  const handleSave = async () => {
    if (!validation.validateAll()) return;
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editing) {
        await update({ id: editing._id, ...payload });
        toastSuccess("Product updated");
      } else {
        await create(payload);
        toastSuccess("Product created");
      }
      closeProductDialog();
    } catch (e) {
      toastError(e, {
        title: "Couldn't save product",
        fallback: "Failed to save product. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await remove({ id: deleteId });
      toastSuccess("Product moved to inactive");
      setDeleteId(null);
    } catch (e) {
      toastError(e, {
        title: "Couldn't deactivate product",
        fallback: "Failed to move product to inactive. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    setSaving(true);
    try {
      await restore({ id: restoreId });
      toastSuccess("Product restored to active");
      setRestoreId(null);
    } catch (e) {
      toastError(e, {
        title: "Couldn't restore product",
        fallback: "Failed to restore product. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const products = results as Product[];
  const canLoadMore = status === "CanLoadMore" && !reorderMode;
  const isLoadingMore = status === "LoadingMore";

  const handleLoadMore = useCallback(() => {
    if (!canLoadMore) return;
    loadMore(ADMIN_LIST_PAGE_SIZE);
  }, [canLoadMore, loadMore]);

  const handleReorderDrop = async (targetId: Id<"products">) => {
    if (!draggedId || draggedId === targetId) return;
    const sourceIndex = products.findIndex((p) => p._id === draggedId);
    const targetIndex = products.findIndex((p) => p._id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const reordered = [...products];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    try {
      await reorder({ orderedIds: reordered.map((p) => p._id) });
      toastSuccess("Product order updated");
    } catch (e) {
      toastError(e, {
        title: "Couldn't reorder products",
        fallback: "Failed to save product order. Please try again.",
      });
    } finally {
      setDraggedId(null);
    }
  };

  const {
    columns: tableColumns,
    visibility: columnVisibility,
    toggleColumn,
    isVisible: isColumnVisible,
  } = useColumnVisibility(PRODUCT_COLUMNS_STORAGE_KEY, PRODUCT_TABLE_COLUMNS);

  const tableColSpan = useMemo(() => {
    let count = tableColumns.filter((col) => isColumnVisible(col.id)).length;
    if (reorderMode) count += 1;
    return count;
  }, [tableColumns, isColumnVisible, reorderMode]);

  const renderProductCell = (columnId: string, p: Product) => {
    switch (columnId) {
      case "image":
        return (
          <TableCell key={columnId}>
            <ProductImageThumbnails images={p.image} alt={p.name} />
          </TableCell>
        );
      case "name":
        return (
          <TableCell key={columnId}>
            <div className="font-medium">{p.name}</div>
          </TableCell>
        );
      case "brand":
        return (
          <TableCell key={columnId} className="text-muted-foreground">
            {p.company}
          </TableCell>
        );
      case "category":
        return (
          <TableCell key={columnId}>{p.category?.name ?? "-"}</TableCell>
        );
      case "price":
        return (
          <TableCell key={columnId} className="text-right">
            {formatCurrencyAmount(p.price, p.currency ?? DEFAULT_CURRENCY)}
          </TableCell>
        );
      case "currency":
        return (
          <TableCell key={columnId} className="text-muted-foreground">
            {p.currency ?? DEFAULT_CURRENCY}
          </TableCell>
        );
      case "colors":
        return (
          <TableCell key={columnId}>
            <ProductColorSwatches colors={p.colors} />
          </TableCell>
        );
      case "stock":
        return (
          <TableCell key={columnId} className="text-right">
            {p.stock}
          </TableCell>
        );
      case "rating":
        return (
          <TableCell key={columnId} className="text-right">
            {p.stars.toFixed(1)}
          </TableCell>
        );
      case "reviews":
        return (
          <TableCell key={columnId} className="text-right">
            {p.reviews}
          </TableCell>
        );
      case "featured":
        return (
          <TableCell key={columnId}>
            {productFlag(p.featured) ? (
              <Badge variant="secondary">Yes</Badge>
            ) : (
              <span className="text-muted-foreground">No</span>
            )}
          </TableCell>
        );
      case "shipping":
        return (
          <TableCell key={columnId}>
            {productFlag(p.shipping) ? (
              <Badge variant="outline">Yes</Badge>
            ) : (
              <span className="text-muted-foreground">No</span>
            )}
          </TableCell>
        );
      case "description":
        return (
          <TableCell
            key={columnId}
            className="max-w-[12rem] whitespace-normal sm:max-w-[14rem]"
          >
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {p.description || "—"}
            </p>
          </TableCell>
        );
      case "actions":
        return (
          <TableCell key={columnId}>
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEdit(p)}
                disabled={reorderMode}
              >
                <Pencil className="size-4" />
              </Button>
              {activeTab === "active" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(p._id)}
                  disabled={reorderMode}
                  aria-label="Move to inactive"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRestoreId(p._id)}
                  disabled={reorderMode}
                  aria-label="Restore to active"
                >
                  <RotateCcw className="size-4 text-emerald-600" />
                </Button>
              )}
            </div>
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Manage your store catalog."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void handleEmbeddingBackfill();
            }}
          >
            Generate search embeddings
          </Button>
        }
      />

      <AdminListToolbar
        activeTab={activeTab}
        onActiveTabChange={(value) => setActiveTab(value as StatusTab)}
        counts={counts ?? undefined}
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search name or brand"
        reorderMode={reorderMode}
        onReorderModeChange={setReorderMode}
        canReorder={activeTab === "active"}
        filters={
          <AdminProductFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyProductFilters())}
          />
        }
        actionLabel="Add product"
        onAction={openCreate}
      />

      <div className="mb-2 flex justify-end sm:mb-3">
        <ColumnVisibilityPanel
          columns={tableColumns}
          visibility={columnVisibility}
          onToggle={toggleColumn}
        />
      </div>

      <AdminTableCard>
        <Table className="min-w-[56rem]">
          <TableHeader>
            <TableRow>
              {reorderMode ? <TableHead className="w-[40px]" /> : null}
              {tableColumns.map((col) => {
                if (!isColumnVisible(col.id)) return null;
                const align =
                  col.id === "price" ||
                  col.id === "stock" ||
                  col.id === "rating" ||
                  col.id === "reviews"
                    ? "text-right"
                    : undefined;
                const width =
                  col.id === "image" || col.id === "colors"
                    ? "min-w-[100px]"
                    : col.id === "description"
                      ? "min-w-[160px]"
                      : col.id === "actions"
                        ? "w-[100px]"
                        : undefined;
                return (
                  <TableHead key={col.id} className={cn(align, width)}>
                    {col.id === "actions" ? "" : col.label}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage" ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={tableColSpan}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={tableColSpan}
                  className="text-center text-muted-foreground"
                >
                  {search || Object.values(filterArgs).some((v) => v !== undefined)
                    ? "No products match your search or filters"
                    : `No ${activeTab} products yet`}
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow
                  key={p._id}
                  draggable={reorderMode}
                  onDragStart={() => setDraggedId(p._id)}
                  onDragOver={(e) => {
                    if (!reorderMode) return;
                    e.preventDefault();
                  }}
                  onDrop={() => {
                    if (!reorderMode) return;
                    void handleReorderDrop(p._id);
                  }}
                >
                  {reorderMode ? (
                    <TableCell className="cursor-grab text-muted-foreground active:cursor-grabbing">
                      <GripVertical className="size-4" />
                    </TableCell>
                  ) : null}
                  {tableColumns.map((col) =>
                    isColumnVisible(col.id) ? renderProductCell(col.id, p) : null
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableCard>

      <AdminTableInfiniteScroll
        enabled={canLoadMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
      />

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <AdminFormField
              label="Product name"
              htmlFor="product-name"
              error={validation.fieldError("name")}
              required
            >
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onBlur={() => validation.touch("name")}
                aria-invalid={!!validation.fieldError("name")}
                className={invalidInputClass(validation.fieldError("name"))}
              />
            </AdminFormField>

            <AdminFormField label="SKU" htmlFor="product-sku">
              <Input
                id="product-sku"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="Optional product SKU"
              />
            </AdminFormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <AdminFormField
                label="Company / brand"
                htmlFor="product-company"
                error={validation.fieldError("company")}
                required
              >
                <Input
                  id="product-company"
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                  onBlur={() => validation.touch("company")}
                  aria-invalid={!!validation.fieldError("company")}
                  className={invalidInputClass(validation.fieldError("company"))}
                />
              </AdminFormField>

              <AdminFormField
                label="Category"
                error={validation.fieldError("categoryId")}
                required
              >
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, categoryId: v ?? "" }));
                    validation.touch("categoryId");
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full",
                      invalidInputClass(validation.fieldError("categoryId"))
                    )}
                    aria-invalid={!!validation.fieldError("categoryId")}
                  >
                    {selectedCategory ? (
                      <span className="flex min-w-0 items-center gap-2 truncate">
                        <span className="truncate font-medium">
                          {selectedCategory.name}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          ({selectedCategory.slug})
                        </span>
                      </span>
                    ) : (
                      <SelectValue placeholder="Select category" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c: ProductCategory) => (
                      <SelectItem key={c._id} value={c._id}>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          ({c.slug})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AdminFormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <AdminFormField
                label="Price"
                htmlFor="product-price"
                error={validation.fieldError("price")}
                required
              >
                <Input
                  id="product-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: Number(e.target.value) }))
                  }
                  onBlur={() => validation.touch("price")}
                  aria-invalid={!!validation.fieldError("price")}
                  className={invalidInputClass(validation.fieldError("price"))}
                />
              </AdminFormField>
              <AdminFormField
                label="Currency"
                error={validation.fieldError("currency")}
                required
              >
                <CurrencySelect
                  value={form.currency}
                  onChange={(currency) => {
                    setForm((f) => ({ ...f, currency }));
                    validation.touch("currency");
                  }}
                  aria-invalid={!!validation.fieldError("currency")}
                  className={invalidInputClass(validation.fieldError("currency"))}
                />
              </AdminFormField>
              <AdminFormField
                label="Stock"
                htmlFor="product-stock"
                error={validation.fieldError("stock")}
                required
              >
                <Input
                  id="product-stock"
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stock: Number(e.target.value) }))
                  }
                  onBlur={() => validation.touch("stock")}
                  aria-invalid={!!validation.fieldError("stock")}
                  className={invalidInputClass(validation.fieldError("stock"))}
                />
              </AdminFormField>
            </div>

            <AdminFormField
              label="Colors"
              error={validation.fieldError("colors")}
              description="Pick preset swatches or enter a custom hex code"
              required
            >
              <ColorInput
                value={form.colors}
                onChange={(colors) => {
                  setForm((f) => ({ ...f, colors }));
                  validation.touch("colors");
                }}
              />
            </AdminFormField>

            <AdminFormField
              label="Product images"
              error={
                validation.fieldError("imageUrls") ??
                form.imageUrls
                  .map((_, i) => validation.fieldError(`imageUrls.${i}`))
                  .find(Boolean)
              }
              description="Upload images or paste URLs — at least one required"
              required
            >
              <ProductImageField
                imageUrls={form.imageUrls}
                imageAlts={form.imageAlts}
                productName={form.name.trim() || "Product"}
                onChange={(imageUrls) =>
                  setForm((f) => ({ ...f, imageUrls }))
                }
                onAltsChange={(imageAlts) =>
                  setForm((f) => ({ ...f, imageAlts }))
                }
                onBlur={(i) => validation.touch(`imageUrls.${i}`)}
                fieldErrors={Object.fromEntries(
                  form.imageUrls.map((_, i) => [
                    i,
                    validation.fieldError(`imageUrls.${i}`),
                  ])
                )}
                error={validation.fieldError("imageUrls")}
              />
            </AdminFormField>

            <AdminFormField
              label="Description"
              htmlFor="product-description"
              error={validation.fieldError("description")}
              required
            >
              <Textarea
                id="product-description"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                onBlur={() => validation.touch("description")}
                aria-invalid={!!validation.fieldError("description")}
                className={invalidInputClass(validation.fieldError("description"))}
              />
            </AdminFormField>

            <ProductFormAiSection
              context={{
                name: form.name,
                company: form.company,
                categoryName: selectedCategory?.name ?? "",
                description: form.description,
                colors: form.colors,
                sku: form.sku,
                price: form.price,
                currency: form.currency,
                discountPercent: form.discountPercent,
                shipping: form.shipping,
                shippingCharges: form.shippingCharges,
                imageUrls: form.imageUrls,
              }}
              fields={{
                description: form.description,
                seoTitle: form.seoTitle,
                seoDescription: form.seoDescription,
                seoKeywords: form.seoKeywords,
                highlights: form.highlights,
                imageAlts: form.imageAlts,
              }}
              onApply={applyAiContent}
            />

            <AdminFormField
              label="Meta title"
              htmlFor="product-seo-title"
              description={seoWarnings.seoTitle}
            >
              <Input
                id="product-seo-title"
                value={form.seoTitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seoTitle: e.target.value }))
                }
                placeholder="SEO page title"
              />
            </AdminFormField>

            <AdminFormField
              label="Meta description"
              htmlFor="product-seo-description"
              description={seoWarnings.seoDescription}
            >
              <Textarea
                id="product-seo-description"
                rows={2}
                value={form.seoDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seoDescription: e.target.value }))
                }
                placeholder="Search engine description"
              />
            </AdminFormField>

            <AdminFormField
              label="SEO keywords"
              htmlFor="product-seo-keywords"
              description="Comma-separated keywords"
            >
              <Input
                id="product-seo-keywords"
                value={form.seoKeywords}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seoKeywords: e.target.value }))
                }
                placeholder="office chair, ergonomic, lumbar support"
              />
            </AdminFormField>

            <AdminFormField
              label="Product highlights"
              description="Short selling points shown on the product page"
            >
              <div className="space-y-2">
                {form.highlights.map((highlight, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={highlight}
                      placeholder="Premium build quality"
                      onChange={(e) => {
                        const next = [...form.highlights];
                        next[i] = e.target.value;
                        setForm((f) => ({ ...f, highlights: next }));
                      }}
                    />
                    {form.highlights.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const next = form.highlights.filter((_, j) => j !== i);
                          setForm((f) => ({
                            ...f,
                            highlights: next.length ? next : [""],
                          }));
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      highlights: [...f.highlights, ""],
                    }))
                  }
                >
                  <Plus className="mr-1 size-4" />
                  Add highlight
                </Button>
              </div>
            </AdminFormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <AdminFormField
                label="Discount percentage (0–100)"
                htmlFor="product-discount"
                error={validation.fieldError("discountPercent")}
              >
                <Input
                  id="product-discount"
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountPercent: Number(e.target.value),
                    }))
                  }
                  onBlur={() => validation.touch("discountPercent")}
                  aria-invalid={!!validation.fieldError("discountPercent")}
                  className={invalidInputClass(
                    validation.fieldError("discountPercent")
                  )}
                />
              </AdminFormField>
              {!form.shipping ? (
                <AdminFormField
                  label="Shipping charges"
                  htmlFor="product-shipping-charges"
                  error={validation.fieldError("shippingCharges")}
                >
                  <Input
                    id="product-shipping-charges"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.shippingCharges}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shippingCharges: Number(e.target.value),
                      }))
                    }
                    onBlur={() => validation.touch("shippingCharges")}
                    aria-invalid={!!validation.fieldError("shippingCharges")}
                    className={invalidInputClass(
                      validation.fieldError("shippingCharges")
                    )}
                  />
                </AdminFormField>
              ) : null}
            </div>

            <ProductFormAiPricingSection
              context={{
                productId: editing?._id,
                name: form.name,
                company: form.company,
                categoryName: selectedCategory?.name ?? "",
                categoryId: (form.categoryId || undefined) as
                  | Id<"productCategories">
                  | undefined,
                description: form.description,
                highlights: form.highlights,
                price: form.price,
                currency: form.currency,
                discountPercent: form.discountPercent,
                stock: form.stock,
                stars: editing?.stars,
                reviews: editing?.reviews,
              }}
              onApplyPrice={(price) =>
                setForm((f) => ({ ...f, price }))
              }
            />

            {editing ? (
              <AdminProductReviewInsights productId={editing._id} />
            ) : null}

            <div className="grid gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="product-active">Active</Label>
                <Switch
                  id="product-active"
                  checked={form.active === true}
                  onCheckedChange={(active) =>
                    setForm((f) => ({ ...f, active: active === true }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="product-featured">Featured</Label>
                <Switch
                  id="product-featured"
                  checked={form.featured === true}
                  onCheckedChange={(featured) =>
                    setForm((f) => ({ ...f, featured: featured === true }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="product-shipping">Free shipping</Label>
                <Switch
                  id="product-shipping"
                  checked={form.shipping === true}
                  onCheckedChange={(shipping) =>
                    setForm((f) => ({
                      ...f,
                      shipping: shipping === true,
                      shippingCharges: shipping === true ? 0 : f.shippingCharges,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeProductDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Move product to inactive?"
        description="The product will be hidden from the store and listed under the Inactive tab. You can restore it later from the Inactive tab."
        confirmLabel="Move to inactive"
        loadingLabel="Moving…"
      />

      <DeleteConfirmDialog
        open={!!restoreId}
        onOpenChange={(o) => !o && setRestoreId(null)}
        onConfirm={handleRestore}
        loading={saving}
        title="Restore product?"
        description="This product will be moved back to the Active tab and shown in the store again."
        confirmLabel="Restore"
        loadingLabel="Restoring…"
        confirmVariant="default"
      />
    </>
  );
}
