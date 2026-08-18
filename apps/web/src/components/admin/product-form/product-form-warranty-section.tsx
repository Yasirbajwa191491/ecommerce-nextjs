"use client";

import { AdminFormField } from "@/components/admin/admin-form-field";
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
import type { ProductForm } from "@/lib/product-form-state";
import {
  WARRANTY_DURATION_OPTIONS,
  WARRANTY_TYPE_OPTIONS,
} from "@/lib/delivery-form-defaults";
import type { Dispatch, SetStateAction } from "react";

type ProductFormWarrantySectionProps = {
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
};

export function ProductFormWarrantySection({
  form,
  setForm,
}: ProductFormWarrantySectionProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4">
        <div>
          <Label htmlFor="warranty-available">Warranty available</Label>
          <p className="text-sm text-muted-foreground">
            Display warranty details on the product page and order history.
          </p>
        </div>
        <Switch
          id="warranty-available"
          checked={form.warrantyAvailable}
          onCheckedChange={(checked) =>
            setForm((current) => ({
              ...current,
              warrantyAvailable: checked === true,
            }))
          }
        />
      </div>

      {form.warrantyAvailable ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminFormField label="Warranty duration">
              <Select
                value={form.warrantyDuration || undefined}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    warrantyDuration: value as ProductForm["warrantyDuration"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {WARRANTY_DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AdminFormField>

            <AdminFormField label="Warranty type">
              <Select
                value={form.warrantyType || undefined}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    warrantyType: value as ProductForm["warrantyType"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {WARRANTY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AdminFormField>
          </div>

          <AdminFormField label="Warranty details">
            <Textarea
              rows={3}
              value={form.warrantyDetails}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  warrantyDetails: event.target.value,
                }))
              }
              placeholder="1 Year Manufacturer Warranty covering manufacturing defects."
            />
          </AdminFormField>
        </>
      ) : null}
    </div>
  );
}
