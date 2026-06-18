"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import {
  PRODUCT_COLUMNS_STORAGE_KEY,
  PRODUCT_TABLE_COLUMNS,
} from "@/lib/admin/product-table-columns";
import { DEFAULT_CURRENCY, formatCurrencyAmount } from "@/lib/currencies";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { cn } from "@/lib/utils";
import { GripVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { Product } from "@/types/product";

function isProductActive(product: Product) {
  return product.active !== false;
}

function productFlag(value: boolean | undefined | null) {
  return value === true;
}

const ADMIN_LIST_PAGE_SIZE = 10;

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit");
  const maxStockParam = searchParams.get("maxStock");
  const deepLinkHandled = useRef(false);

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

  const [deleteId, setDeleteId] = useState<Id<"products"> | null>(null);
  const [restoreId, setRestoreId] = useState<Id<"products"> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (activeTab === "inactive") setReorderMode(false);
  }, [activeTab]);

  useEffect(() => {
    if (deepLinkHandled.current || !editParam) return;
    deepLinkHandled.current = true;
    router.replace(`/admin/products/${editParam}/edit`);
  }, [editParam, router]);

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
                onClick={() => router.push(`/admin/products/${p._id}/edit`)}
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
        onAction={() => router.push("/admin/products/new")}
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
