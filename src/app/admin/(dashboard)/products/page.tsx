"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
import { useFormValidation } from "@/hooks/use-form-validation";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { validateProductForm } from "@/lib/validation/admin-forms";
import { cn } from "@/lib/utils";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { Product, ProductCategory } from "@/types/product";

type ProductForm = {
  name: string;
  company: string;
  price: number;
  colors: string;
  imageUrls: string[];
  categoryId: string;
  featured: boolean;
  shipping: boolean;
  stock: number;
  reviews: number;
  stars: number;
  description: string;
};

const emptyForm = (): ProductForm => ({
  name: "",
  company: "",
  price: 0,
  colors: "",
  imageUrls: [""],
  categoryId: "",
  featured: false,
  shipping: true,
  stock: 0,
  reviews: 0,
  stars: 0,
  description: "",
});

export default function AdminProductsPage() {
  const categories = useQuery(api.productCategories.listActive) ?? [];
  const { results, status, loadMore } = usePaginatedQuery(
    api.products.listPaginated,
    {},
    { initialNumItems: 20 }
  );
  const create = useMutation(api.products.create);
  const update = useMutation(api.products.update);
  const remove = useMutation(api.products.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<Id<"products"> | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = useCallback(
    (values: ProductForm) => validateProductForm(values),
    []
  );
  const validation = useFormValidation(form, validate);
  const resetValidation = validation.reset;

  useEffect(() => {
    if (!dialogOpen) resetValidation();
  }, [dialogOpen, resetValidation]);

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
      price: p.price,
      colors: p.colors.join(", "),
      imageUrls: p.image.length ? p.image.map((i) => i.url) : [""],
      categoryId: p.categoryId,
      featured: p.featured,
      shipping: p.shipping,
      stock: p.stock,
      reviews: p.reviews,
      stars: p.stars,
      description: p.description,
    });
    resetValidation();
    setDialogOpen(true);
  };

  const toPayload = (f: ProductForm) => ({
    name: f.name.trim(),
    company: f.company.trim(),
    price: Number(f.price),
    colors: f.colors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    image: f.imageUrls
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url) => ({ url })),
    categoryId: f.categoryId as Id<"productCategories">,
    featured: f.featured,
    shipping: f.shipping,
    stock: Number(f.stock),
    reviews: Number(f.reviews),
    stars: Number(f.stars),
    description: f.description.trim(),
  });

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
      setDialogOpen(false);
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
      toastSuccess("Product deleted");
      setDeleteId(null);
    } catch (e) {
      toastError(e, {
        title: "Couldn't delete product",
        fallback: "Failed to delete product. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Manage your store catalog."
        actionLabel="Add product"
        onAction={openCreate}
      />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[72px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "LoadingFirstPage" ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No products yet
                </TableCell>
              </TableRow>
            ) : (
              results.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>
                    <Image
                      src={p.image[0]?.url ?? "/next.svg"}
                      alt={p.name}
                      width={48}
                      height={48}
                      className="rounded-md object-cover"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.featured ? (
                      <Badge variant="secondary" className="mt-1">
                        Featured
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{p.category?.name ?? "ΓÇö"}</TableCell>
                  <TableCell className="text-right">Γé╣{p.price}</TableCell>
                  <TableCell className="text-right">{p.stock}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(p._id)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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
                    invalidInputClass(validation.fieldError("categoryId"))
                  )}
                  aria-invalid={!!validation.fieldError("categoryId")}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: ProductCategory) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AdminFormField>
            <div className="grid grid-cols-2 gap-4">
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
              htmlFor="product-colors"
              error={validation.fieldError("colors")}
              description="Comma-separated, e.g. black, grey, white"
              required
            >
              <Input
                id="product-colors"
                value={form.colors}
                onChange={(e) => setForm((f) => ({ ...f, colors: e.target.value }))}
                onBlur={() => validation.touch("colors")}
                aria-invalid={!!validation.fieldError("colors")}
                className={invalidInputClass(validation.fieldError("colors"))}
              />
            </AdminFormField>
            <AdminFormField
              label="Image URLs"
              error={
                validation.fieldError("imageUrls") ??
                form.imageUrls
                  .map((_, i) => validation.fieldError(`imageUrls.${i}`))
                  .find(Boolean)
              }
              description="At least one https:// image link"
              required
            >
              {form.imageUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={url}
                    placeholder="https://..."
                    onChange={(e) => {
                      const next = [...form.imageUrls];
                      next[i] = e.target.value;
                      setForm((f) => ({ ...f, imageUrls: next }));
                    }}
                    onBlur={() => validation.touch(`imageUrls.${i}`)}
                    aria-invalid={!!validation.fieldError(`imageUrls.${i}`)}
                    className={invalidInputClass(
                      validation.fieldError(`imageUrls.${i}`)
                    )}
                  />
                  {form.imageUrls.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          imageUrls: f.imageUrls.filter((_, j) => j !== i),
                        }))
                      }
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
                className="mt-2"
                onClick={() =>
                  setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ""] }))
                }
              >
                <Plus className="mr-1 size-4" />
                Add image URL
              </Button>
            </AdminFormField>
            <AdminFormField
              label="Description"
              htmlFor="product-description"
              error={validation.fieldError("description")}
              required
            >
              <Textarea
                id="product-description"
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
            <div className="grid grid-cols-2 gap-4">
              <AdminFormField
                label="Reviews"
                htmlFor="product-reviews"
                error={validation.fieldError("reviews")}
              >
                <Input
                  id="product-reviews"
                  type="number"
                  min={0}
                  value={form.reviews}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reviews: Number(e.target.value) }))
                  }
                  onBlur={() => validation.touch("reviews")}
                  aria-invalid={!!validation.fieldError("reviews")}
                  className={invalidInputClass(validation.fieldError("reviews"))}
                />
              </AdminFormField>
              <AdminFormField
                label="Rating (0–5)"
                htmlFor="product-stars"
                error={validation.fieldError("stars")}
              >
                <Input
                  id="product-stars"
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={form.stars}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stars: Number(e.target.value) }))
                  }
                  onBlur={() => validation.touch("stars")}
                  aria-invalid={!!validation.fieldError("stars")}
                  className={invalidInputClass(validation.fieldError("stars"))}
                />
              </AdminFormField>
            </div>
            <div className="flex items-center justify-between">
              <Label>Featured</Label>
              <Switch
                checked={form.featured}
                onCheckedChange={(featured) => setForm((f) => ({ ...f, featured }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Free shipping</Label>
              <Switch
                checked={form.shipping}
                onCheckedChange={(shipping) => setForm((f) => ({ ...f, shipping }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "SavingΓÇª" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={saving}
      />
    </>
  );
}
