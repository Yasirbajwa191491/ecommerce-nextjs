"use client";



import type { Dispatch, SetStateAction } from "react";

import {

  AdminFormField,

  invalidInputClass,

} from "@/components/admin/admin-form-field";

import { PromotionProductPicker } from "@/components/admin/promotions/promotion-product-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import type { useFormValidation } from "@/hooks/use-form-validation";

import type { Id } from "../../../../convex/_generated/dataModel";

import {

  PROMOTION_TYPE_OPTIONS,

  promotionStatusLabel,

  promotionTypeLabel,

  type PromotionType,

} from "@/lib/admin/promotion-labels";

import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/promotion-datetime";



export {

  PROMOTION_TYPE_OPTIONS,

  promotionTypeLabel,

  type PromotionType,

} from "@/lib/admin/promotion-labels";



export type PromotionFormState = {

  type: PromotionType;

  name: string;

  description: string;

  promotionMessage: string;

  bannerText: string;

  buyProductId: Id<"products"> | "";

  buyProductName: string;

  buyQuantity: number;

  getProductId: Id<"products"> | "";

  getProductName: string;

  getQuantity: number;

  startAt: string;

  endAt: string;

  status: "active" | "inactive";

};



export function emptyPromotionForm(): PromotionFormState {

  const now = Date.now();

  const weekLater = now + 7 * 24 * 60 * 60 * 1000;

  return {

    type: "bogo",

    name: "",

    description: "",

    promotionMessage: "",

    bannerText: "",

    buyProductId: "",

    buyProductName: "",

    buyQuantity: 1,

    getProductId: "",

    getProductName: "",

    getQuantity: 1,

    startAt: toDatetimeLocalValue(now),

    endAt: toDatetimeLocalValue(weekLater),

    status: "active",

  };

}



export type PromotionFormValidation = ReturnType<

  typeof useFormValidation<PromotionFormState>

>;



type PromotionFormProps = {

  form: PromotionFormState;

  setForm: Dispatch<SetStateAction<PromotionFormState>>;

  validation: PromotionFormValidation;

};



export function PromotionForm({ form, setForm, validation }: PromotionFormProps) {

  const showGetProduct =

    form.type === "buy_x_get_y" ||

    form.type === "free_gift" ||

    form.type === "cross_product";



  return (

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">

      <Card>

        <CardHeader>

          <CardTitle className="text-base">Promotion details</CardTitle>

        </CardHeader>

        <CardContent className="space-y-4">

          <AdminFormField label="Promotion type" required>

            <Select

              value={form.type}

              onValueChange={(v) => {

                if (!v) return;

                const nextType = v as PromotionType;

                validation.touch("type");

                setForm((f) => ({

                  ...f,

                  type: nextType,

                  getProductId:

                    nextType === "bogo" ? f.buyProductId : f.getProductId,

                  getProductName:

                    nextType === "bogo" ? f.buyProductName : f.getProductName,

                }));

              }}

            >

              <SelectTrigger className="w-full max-w-none">

                <SelectValue placeholder="Select promotion type">

                  {promotionTypeLabel(form.type)}

                </SelectValue>

              </SelectTrigger>

              <SelectContent

                className="min-w-[18rem]"

                alignItemWithTrigger={false}

              >

                {PROMOTION_TYPE_OPTIONS.map((option) => (

                  <SelectItem

                    key={option.value}

                    value={option.value}

                    className="whitespace-normal"

                  >

                    {option.label}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </AdminFormField>



          <AdminFormField

            label="Promotion name"

            required

            error={validation.fieldError("name")}

          >

            <Input

              value={form.name}

              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}

              onBlur={() => validation.touch("name")}

              placeholder="Summer BOGO Chair Deal"

              aria-invalid={!!validation.fieldError("name")}

              className={invalidInputClass(validation.fieldError("name"))}

            />

          </AdminFormField>



          <AdminFormField label="Description">

            <Textarea

              value={form.description}

              onChange={(e) =>

                setForm((f) => ({ ...f, description: e.target.value }))

              }

              rows={2}

            />

          </AdminFormField>



          {(form.type === "free_gift" || form.type === "cross_product") && (

            <>

              <AdminFormField label="Promotion message">

                <Input

                  value={form.promotionMessage}

                  onChange={(e) =>

                    setForm((f) => ({ ...f, promotionMessage: e.target.value }))

                  }

                  placeholder="Receive a desk organizer free"

                />

              </AdminFormField>

              <AdminFormField label="Banner text">

                <Input

                  value={form.bannerText}

                  onChange={(e) =>

                    setForm((f) => ({ ...f, bannerText: e.target.value }))

                  }

                  placeholder="Free gift included"

                />

              </AdminFormField>

            </>

          )}



          <div className="grid gap-4 sm:grid-cols-2">

            <AdminFormField

              label="Start date"

              required

              error={validation.fieldError("startAt")}

            >

              <Input

                type="datetime-local"

                value={form.startAt}

                onChange={(e) =>

                  setForm((f) => ({ ...f, startAt: e.target.value }))

                }

                onBlur={() => validation.touch("startAt")}

                aria-invalid={!!validation.fieldError("startAt")}

                className={invalidInputClass(validation.fieldError("startAt"))}

              />

            </AdminFormField>

            <AdminFormField

              label="End date"

              required

              error={validation.fieldError("endAt")}

            >

              <Input

                type="datetime-local"

                value={form.endAt}

                onChange={(e) =>

                  setForm((f) => ({ ...f, endAt: e.target.value }))

                }

                onBlur={() => validation.touch("endAt")}

                aria-invalid={!!validation.fieldError("endAt")}

                className={invalidInputClass(validation.fieldError("endAt"))}

              />

            </AdminFormField>

          </div>



          <AdminFormField label="Status">

            <Select

              value={form.status}

              onValueChange={(v) => {

                if (!v) return;

                setForm((f) => ({

                  ...f,

                  status: v as PromotionFormState["status"],

                }));

              }}

            >

              <SelectTrigger className="w-full max-w-none">

                <SelectValue placeholder="Select status">

                  {promotionStatusLabel(form.status)}

                </SelectValue>

              </SelectTrigger>

              <SelectContent

                className="min-w-[12rem]"

                alignItemWithTrigger={false}

              >

                <SelectItem value="active">Active</SelectItem>

                <SelectItem value="inactive">Inactive</SelectItem>

              </SelectContent>

            </Select>

          </AdminFormField>

        </CardContent>

      </Card>



      <Card className="lg:sticky lg:top-4 lg:self-start">

        <CardHeader>

          <CardTitle className="text-base">Eligible products</CardTitle>

        </CardHeader>

        <CardContent className="space-y-4">

          <div className="space-y-4">

            <AdminFormField

              label="Buy product (eligible product)"

              required

              error={validation.fieldError("buyProductId")}

            >

              <PromotionProductPicker

                hideLabel

                label="Buy product (eligible product)"

                value={form.buyProductId}

                selectedName={form.buyProductName}

                error={validation.fieldError("buyProductId")}

                onBlur={() => validation.touch("buyProductId")}

                onChange={(id, name) => {

                  validation.touch("buyProductId");

                  setForm((f) => ({

                    ...f,

                    buyProductId: id,

                    buyProductName: name,

                    ...(f.type === "bogo"

                      ? { getProductId: id, getProductName: name }

                      : {}),

                  }));

                }}

              />

            </AdminFormField>

            {showGetProduct ? (

              <AdminFormField

                label={

                  form.type === "free_gift" ? "Gift product" : "Free product"

                }

                required

                error={validation.fieldError("getProductId")}

              >

                <PromotionProductPicker

                  hideLabel

                  label={

                    form.type === "free_gift" ? "Gift product" : "Free product"

                  }

                  value={form.getProductId}

                  selectedName={form.getProductName}

                  error={validation.fieldError("getProductId")}

                  onBlur={() => validation.touch("getProductId")}

                  onChange={(id, name) => {

                    validation.touch("getProductId");

                    setForm((f) => ({

                      ...f,

                      getProductId: id,

                      getProductName: name,

                    }));

                  }}

                />

              </AdminFormField>

            ) : null}

          </div>



          <div className="grid gap-4 sm:grid-cols-2">

            <AdminFormField

              label="Buy quantity"

              required

              error={validation.fieldError("buyQuantity")}

            >

              <Input

                type="number"

                min={1}

                value={form.buyQuantity}

                onChange={(e) =>

                  setForm((f) => ({

                    ...f,

                    buyQuantity: Number(e.target.value) || 1,

                  }))

                }

                onBlur={() => validation.touch("buyQuantity")}

                aria-invalid={!!validation.fieldError("buyQuantity")}

                className={invalidInputClass(validation.fieldError("buyQuantity"))}

              />

            </AdminFormField>

            <AdminFormField

              label="Free quantity"

              required

              error={validation.fieldError("getQuantity")}

            >

              <Input

                type="number"

                min={1}

                value={form.getQuantity}

                onChange={(e) =>

                  setForm((f) => ({

                    ...f,

                    getQuantity: Number(e.target.value) || 1,

                  }))

                }

                onBlur={() => validation.touch("getQuantity")}

                aria-invalid={!!validation.fieldError("getQuantity")}

                className={invalidInputClass(validation.fieldError("getQuantity"))}

              />

            </AdminFormField>

          </div>

        </CardContent>

      </Card>

    </div>

  );

}



export function promotionFormToPayload(form: PromotionFormState) {

  if (!form.buyProductId) throw new Error("Select a buy product");

  if (

    (form.type === "buy_x_get_y" ||

      form.type === "free_gift" ||

      form.type === "cross_product") &&

    !form.getProductId

  ) {

    throw new Error("Select a free/gift product");

  }

  if (!form.name.trim()) throw new Error("Promotion name is required");



  return {

    type: form.type,

    name: form.name.trim(),

    description: form.description.trim() || undefined,

    promotionMessage: form.promotionMessage.trim() || undefined,

    bannerText: form.bannerText.trim() || undefined,

    buyProductId: form.buyProductId,

    buyQuantity: form.buyQuantity,

    getProductId:

      form.type === "bogo" ? undefined : form.getProductId || undefined,

    getQuantity: form.getQuantity,

    startAt: fromDatetimeLocalValue(form.startAt),

    endAt: fromDatetimeLocalValue(form.endAt),

    status: form.status,

  };

}


