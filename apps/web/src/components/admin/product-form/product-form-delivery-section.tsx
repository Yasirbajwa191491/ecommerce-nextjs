"use client";

import { AdminFormField } from "@/components/admin/admin-form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ProductForm } from "@/lib/product-form-state";
import {
  DELIVERY_METHOD_LABELS,
  type DeliveryOptionForm,
} from "@/lib/delivery-form-defaults";
import type { Dispatch, SetStateAction } from "react";

type ProductFormDeliverySectionProps = {
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
};

export function ProductFormDeliverySection({
  form,
  setForm,
}: ProductFormDeliverySectionProps) {
  const updateOption = (
    type: DeliveryOptionForm["type"],
    patch: Partial<DeliveryOptionForm>
  ) => {
    setForm((current) => ({
      ...current,
      deliveryOptions: current.deliveryOptions.map((option) =>
        option.type === type ? { ...option, ...patch } : option
      ),
    }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enable delivery methods customers can choose at checkout. Standard
        delivery uses the free shipping toggle and shipping charges from the
        Shipping tab.
      </p>

      {form.deliveryOptions.map((option) => (
        <div
          key={option.type}
          className="space-y-4 rounded-lg border border-border/60 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor={`delivery-${option.type}`}>
                {DELIVERY_METHOD_LABELS[option.type]}
              </Label>
              {option.type === "standard" ? (
                <p className="text-xs text-muted-foreground">
                  Charges come from Shipping settings when free shipping is off.
                </p>
              ) : null}
            </div>
            <Switch
              id={`delivery-${option.type}`}
              checked={option.enabled}
              onCheckedChange={(enabled) =>
                updateOption(option.type, { enabled: enabled === true })
              }
            />
          </div>

          {option.enabled && option.type !== "standard" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminFormField label="Delivery charge">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={option.charge}
                  onChange={(event) =>
                    updateOption(option.type, {
                      charge: Number(event.target.value),
                    })
                  }
                />
              </AdminFormField>
              <AdminFormField label="Estimated delivery">
                <Input
                  value={option.estimate}
                  onChange={(event) =>
                    updateOption(option.type, {
                      estimate: event.target.value,
                    })
                  }
                  placeholder="1-2 Business Days"
                />
              </AdminFormField>
            </div>
          ) : option.enabled && option.type === "standard" ? (
            <AdminFormField label="Estimated delivery">
              <Input
                value={option.estimate}
                onChange={(event) =>
                  updateOption(option.type, {
                    estimate: event.target.value,
                  })
                }
                placeholder="3-5 Business Days"
              />
            </AdminFormField>
          ) : null}
        </div>
      ))}
    </div>
  );
}
