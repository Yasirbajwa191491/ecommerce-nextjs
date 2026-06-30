"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, X } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminFormField, invalidInputClass } from "@/components/admin/admin-form-field";
import { AdminProductReviewInsights } from "@/components/admin/admin-product-review-insights";
import { ColorInput } from "@/components/admin/color-input";
import { CurrencySelect } from "@/components/admin/currency-select";
import { ProductImageField } from "@/components/admin/product-image-field";
import {
  ProductFormAiSection,
  type ProductAiApplyPayload,
} from "@/components/admin/product-form-ai-section";
import { ProductFormAiPricingSection } from "@/components/admin/product-form-ai-pricing-section";
import { ProductFormPromotionsSection } from "@/components/admin/product-form/product-form-promotions-section";
import { ProductFormWarrantySection } from "@/components/admin/product-form/product-form-warranty-section";
import { ProductFormDeliverySection } from "@/components/admin/product-form/product-form-delivery-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductForm } from "@/lib/product-form-state";
import { getProductFormWarnings } from "@/lib/validation/admin-forms";
import { cn } from "@/lib/utils";
import type { Product, ProductCategory } from "@/types/product";
import type { ProductAiContentProvider } from "@/lib/product-ai-provider";
import type { useFormValidation } from "@/hooks/use-form-validation";

type Validation = ReturnType<typeof useFormValidation<ProductForm>>;

type ProductFormFieldsProps = {
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  validation: Validation;
  categoryOptions: ProductCategory[];
  product?: Product | null;
  onApplyAiContent: (payload: ProductAiApplyPayload) => void;
  aiContentProvider: ProductAiContentProvider;
  onAiContentProviderChange: (provider: ProductAiContentProvider) => void;
};

export function ProductFormFields({
  form,
  setForm,
  validation,
  categoryOptions,
  product,
  onApplyAiContent,
  aiContentProvider,
  onAiContentProviderChange,
}: ProductFormFieldsProps) {
  const selectedCategory = categoryOptions.find((c) => c._id === form.categoryId);
  const seoWarnings = getProductFormWarnings(form);

  const flagsSidebar = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Visibility & shipping</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );

  return (
    <>
      <Tabs defaultValue="general" className="space-y-6">
        <div className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">
          <TabsList className="inline-flex h-auto w-max max-w-none flex-nowrap justify-start gap-1 p-1 [&_[data-slot=tabs-trigger]]:h-8 [&_[data-slot=tabs-trigger]]:flex-none [&_[data-slot=tabs-trigger]]:shrink-0 [&_[data-slot=tabs-trigger]]:px-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="warranty">Warranty</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="ai">AI Tools</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
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
                      <span className="truncate font-medium">{selectedCategory.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        ({selectedCategory.slug})
                      </span>
                    </span>
                  ) : (
                    <SelectValue placeholder="Select category" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground"> ({c.slug})</span>
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
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="images">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminFormField
            label="Product images"
            error={
              validation.fieldError("imageUrls") ??
              form.imageUrls
                .map((_, i) => validation.fieldError(`imageUrls.${i}`))
                .find(Boolean)
            }
            description="Upload images or paste URLs — at least one required. Set one as the default storefront image."
            required
          >
            <ProductImageField
              imageUrls={form.imageUrls}
              imageAlts={form.imageAlts}
              primaryIndex={form.primaryImageIndex}
              onPrimaryIndexChange={(primaryImageIndex) =>
                setForm((f) => ({ ...f, primaryImageIndex }))
              }
              productName={form.name.trim() || "Product"}
              onChange={(imageUrls) => setForm((f) => ({ ...f, imageUrls }))}
              onAltsChange={(imageAlts) => setForm((f) => ({ ...f, imageAlts }))}
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
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="ai">
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
        onApply={onApplyAiContent}
        provider={aiContentProvider}
        onProviderChange={onAiContentProviderChange}
      />
        </TabsContent>

        <TabsContent value="seo">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminFormField
            label="Meta title"
            htmlFor="product-seo-title"
            description={seoWarnings.seoTitle}
          >
            <Input
              id="product-seo-title"
              value={form.seoTitle}
              onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
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
                  setForm((f) => ({ ...f, highlights: [...f.highlights, ""] }))
                }
              >
                <Plus className="mr-1 size-4" />
                Add highlight
              </Button>
            </div>
          </AdminFormField>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="pricing">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing & discounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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
              className={invalidInputClass(validation.fieldError("discountPercent"))}
            />
          </AdminFormField>

          <ProductFormAiPricingSection
            context={{
              productId: product?._id,
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
              stars: product?.stars,
              reviews: product?.reviews,
            }}
            onApplyPrice={(price) => setForm((f) => ({ ...f, price }))}
          />
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="shipping">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4">
            <Label htmlFor="product-shipping-tab">Free shipping</Label>
            <Switch
              id="product-shipping-tab"
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
                className={invalidInputClass(validation.fieldError("shippingCharges"))}
              />
            </AdminFormField>
          ) : null}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="delivery">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery options</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductFormDeliverySection form={form} setForm={setForm} />
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="warranty">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Warranty information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductFormWarrantySection form={form} setForm={setForm} />
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="promotions">
      <ProductFormPromotionsSection productId={product?._id} />
        </TabsContent>

        <TabsContent value="inventory">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory & visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminFormField
              label="Price"
              htmlFor="product-price-inventory"
              error={validation.fieldError("price")}
              required
            >
              <Input
                id="product-price-inventory"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: Number(e.target.value) }))
                }
                onBlur={() => validation.touch("price")}
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
              />
            </AdminFormField>
            <AdminFormField
              label="Stock"
              htmlFor="product-stock-inventory"
              error={validation.fieldError("stock")}
              required
            >
              <Input
                id="product-stock-inventory"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stock: Number(e.target.value) }))
                }
                onBlur={() => validation.touch("stock")}
              />
            </AdminFormField>
          </div>
          {flagsSidebar}
        </CardContent>
      </Card>
      {product ? <AdminProductReviewInsights productId={product._id} /> : null}
        </TabsContent>
      </Tabs>

      <div className="lg:hidden">{flagsSidebar}</div>
    </>
  );
}

export function ProductFormSidebarFlags(props: ProductFormFieldsProps) {
  const selectedCategory = props.categoryOptions.find(
    (c) => c._id === props.form.categoryId
  );
  void selectedCategory;

  return (
    <div className="hidden lg:block">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visibility & shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="product-active-sidebar">Active</Label>
            <Switch
              id="product-active-sidebar"
              checked={props.form.active === true}
              onCheckedChange={(active) =>
                props.setForm((f) => ({ ...f, active: active === true }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="product-featured-sidebar">Featured</Label>
            <Switch
              id="product-featured-sidebar"
              checked={props.form.featured === true}
              onCheckedChange={(featured) =>
                props.setForm((f) => ({ ...f, featured: featured === true }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="product-shipping-sidebar">Free shipping</Label>
            <Switch
              id="product-shipping-sidebar"
              checked={props.form.shipping === true}
              onCheckedChange={(shipping) =>
                props.setForm((f) => ({
                  ...f,
                  shipping: shipping === true,
                  shippingCharges: shipping === true ? 0 : f.shippingCharges,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
