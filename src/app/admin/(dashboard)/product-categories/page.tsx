"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { AdminFormField, invalidInputClass } from "@/components/admin/admin-form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { useFormValidation } from "@/hooks/use-form-validation";
import { validateCategoryForm } from "@/lib/validation/admin-forms";
import { slugify } from "@/lib/slugify";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Pencil, Trash2 } from "lucide-react";
import type { ProductCategory } from "@/types/product";

const emptyForm = {
  name: "",
  description: "",
  slug: "",
  active: true,
  sortOrder: 0,
};

export default function ProductCategoriesPage() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.productCategories.listPaginated,
    {},
    { initialNumItems: 20 }
  );
  const create = useMutation(api.productCategories.create);
  const update = useMutation(api.productCategories.update);
  const remove = useMutation(api.productCategories.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<Id<"productCategories"> | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = useCallback(
    (values: typeof form) => validateCategoryForm(values),
    []
  );
  const validation = useFormValidation(form, validate);
  const resetValidation = validation.reset;

  useEffect(() => {
    if (!dialogOpen) resetValidation();
  }, [dialogOpen, resetValidation]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    resetValidation();
    setDialogOpen(true);
  };

  const openEdit = (cat: ProductCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description,
      slug: cat.slug,
      active: cat.active,
      sortOrder: cat.sortOrder,
    });
    resetValidation();
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: editing ? f.slug : slugify(name),
    }));
  };

  const handleSave = async () => {
    if (!validation.validateAll()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        slug: form.slug.trim() || slugify(form.name),
        active: form.active,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await update({ id: editing._id, ...payload });
        toastSuccess("Category updated");
      } else {
        await create(payload);
        toastSuccess("Category created");
      }
      setDialogOpen(false);
    } catch (e) {
      toastError(e, {
        title: "Couldn't save category",
        fallback: "Failed to save category. Please try again.",
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
      toastSuccess("Category deleted");
      setDeleteId(null);
    } catch (e) {
      toastError(e, {
        title: "Couldn't delete category",
        fallback: "Failed to delete category. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Product categories"
        description="Manage catalog categories shown in the store."
        actionLabel="Add category"
        onAction={openCreate}
      />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sort</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage" ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No categories yet
                </TableCell>
              </TableRow>
            ) : (
              results.map((cat) => (
                <TableRow key={cat._id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell>
                    <Badge variant={cat.active ? "default" : "secondary"}>
                      {cat.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{cat.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(cat._id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {status === "CanLoadMore" ? (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => loadMore(20)}>
            Load more
          </Button>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit category" : "New category"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <AdminFormField
              label="Name"
              htmlFor="cat-name"
              error={validation.fieldError("name")}
              required
            >
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => validation.touch("name")}
                aria-invalid={!!validation.fieldError("name")}
                className={invalidInputClass(validation.fieldError("name"))}
              />
            </AdminFormField>
            <AdminFormField
              label="Slug"
              htmlFor="cat-slug"
              error={validation.fieldError("slug")}
              description="URL-friendly identifier (auto-generated from name)"
              required
            >
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))
                }
                onBlur={() => validation.touch("slug")}
                aria-invalid={!!validation.fieldError("slug")}
                className={invalidInputClass(validation.fieldError("slug"))}
              />
            </AdminFormField>
            <AdminFormField
              label="Description"
              htmlFor="cat-description"
              error={validation.fieldError("description")}
              description="Optional, max 500 characters"
            >
              <Textarea
                id="cat-description"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                onBlur={() => validation.touch("description")}
                aria-invalid={!!validation.fieldError("description")}
                className={invalidInputClass(validation.fieldError("description"))}
              />
            </AdminFormField>
            <AdminFormField
              label="Sort order"
              htmlFor="cat-sort"
              error={validation.fieldError("sortOrder")}
              description="Lower numbers appear first (0–9999)"
            >
              <Input
                id="cat-sort"
                type="number"
                min={0}
                max={9999}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
                onBlur={() => validation.touch("sortOrder")}
                aria-invalid={!!validation.fieldError("sortOrder")}
                className={invalidInputClass(validation.fieldError("sortOrder"))}
              />
            </AdminFormField>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm font-medium">Active</span>
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete category?"
        description="Products using this category must be reassigned first."
      />
    </>
  );
}
