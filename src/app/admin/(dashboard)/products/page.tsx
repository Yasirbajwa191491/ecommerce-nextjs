"use client";

import { useState } from "react";
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
import { toast } from "sonner";
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

  const openCreate = () => {
    setEditing(null);
    const f = emptyForm();
    if (categories[0]) f.categoryId = categories[0]._id;
    setForm(f);
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
    if (!form.name.trim() || !form.categoryId) {
      toast.error("Name and category are required");
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editing) {
        await update({ id: editing._id, ...payload });
        toast.success("Product updated");
      } else {
        await create(payload);
        toast.success("Product created");
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await remove({ id: deleteId });
      toast.success("Product deleted");
      setDeleteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
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
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v ?? "" }))}
              >
                <SelectTrigger>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stock: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Colors (comma-separated)</Label>
              <Input
                value={form.colors}
                onChange={(e) => setForm((f) => ({ ...f, colors: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Image URLs</Label>
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
                onClick={() =>
                  setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, ""] }))
                }
              >
                <Plus className="mr-1 size-4" />
                Add image URL
              </Button>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Reviews</Label>
                <Input
                  type="number"
                  value={form.reviews}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reviews: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Stars</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.stars}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stars: Number(e.target.value) }))
                  }
                />
              </div>
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
