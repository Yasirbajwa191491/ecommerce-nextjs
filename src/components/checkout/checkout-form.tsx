"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { Loader2, Lock, ShoppingBag } from "lucide-react";
import type { Value } from "react-phone-number-input";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  AdminFormField,
  invalidInputClass,
} from "@/components/admin/admin-form-field";
import { PaymentMethodSelector } from "@/components/checkout/payment-method-selector";
import {
  DeliveryMethodSelector,
  type DeliveryMethodOption,
} from "@/components/checkout/delivery-method-selector";
import { ShopButton, ShopInput, ShopLabel, ShopTextarea } from "@/components/shop";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/phone-input";
import { cartItemsToCheckoutLines } from "@/lib/cart-lines";
import { useCartContext } from "@/context/cart_context";
import { useFormValidation } from "@/hooks/use-form-validation";
import {
  createIdempotencyKey,
  saveCheckoutCustomer,
} from "@/lib/checkout-customer-storage";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { SHOP_BODY_SM, SHOP_SUBSECTION_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";
import {
  validateCheckoutForm,
  type CheckoutFormValues,
  type PaymentMethod,
} from "@/lib/validation/checkout-form";

type CheckoutFormProps = {
  initialValues?: Partial<CheckoutFormValues>;
  deliveryMethods?: DeliveryMethodOption[];
  deliveryMethod?: string;
  onDeliveryMethodChange?: (method: string) => void;
  pricingLoading?: boolean;
  currency?: string;
};

const emptyForm = (): CheckoutFormValues => ({
  fullName: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  paymentMethod: "",
  termsAccepted: false,
  privacyAccepted: false,
});

function CheckoutFormField({
  label,
  htmlFor,
  error,
  description,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Field data-invalid={!!error}>
      <ShopLabel htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </ShopLabel>
      <FieldContent>
        {children}
        {description && !error ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
        <FieldError>{error}</FieldError>
      </FieldContent>
    </Field>
  );
}

export function CheckoutForm({
  initialValues,
  deliveryMethods = [],
  deliveryMethod = "standard",
  onDeliveryMethodChange,
  pricingLoading = false,
  currency = "USD",
}: CheckoutFormProps) {
  const router = useRouter();
  const { cart } = useCartContext();
  const [form, setForm] = useState<CheckoutFormValues>({
    ...emptyForm(),
    ...initialValues,
  });
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const createCashOrder = useMutation(api.orders.createCashOrder);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const saveCustomerProfile = useMutation(api.orders.saveCustomerProfile);

  const validate = useCallback(
    (values: CheckoutFormValues) => validateCheckoutForm(values),
    []
  );
  const validation = useFormValidation(form, validate);

  const cartLines = useMemo(() => cartItemsToCheckoutLines(cart), [cart]);

  const customerPayload = useMemo(
    () => ({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
      termsAccepted: form.termsAccepted,
      privacyAccepted: form.privacyAccepted,
    }),
    [form]
  );

  const persistCustomer = async () => {
    saveCheckoutCustomer({
      fullName: customerPayload.fullName,
      email: customerPayload.email,
      phone: customerPayload.phone,
      address: customerPayload.address,
      notes: form.notes.trim() || undefined,
    });
    try {
      await saveCustomerProfile({
        email: customerPayload.email,
        fullName: customerPayload.fullName,
        phone: customerPayload.phone,
        address: customerPayload.address,
      });
    } catch {
      // Non-blocking for checkout completion
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validation.validateAll()) return;
    if (!cartLines.length) {
      toastError("Your cart is empty");
      router.push("/cart");
      return;
    }

    if (cartLines.some((line) => !line.productId?.trim())) {
      toastError("Some cart items are outdated. Please remove them and add products again.");
      router.push("/cart");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        lines: cartLines,
        customer: customerPayload,
        idempotencyKey: idempotencyKeyRef.current,
        deliveryMethod: deliveryMethod as
          | "standard"
          | "express"
          | "same_day"
          | "next_day"
          | "pickup",
      };

      if (form.paymentMethod === "cod") {
        const result = await createCashOrder(payload);
        await persistCustomer();
        sessionStorage.setItem("lastOrderNumber", result.orderNumber);
        sessionStorage.setItem("lastOrderEmail", customerPayload.email);
        toastSuccess("Order placed successfully!");
        router.replace(
          `/checkout/success?orderNumber=${encodeURIComponent(result.orderNumber)}`
        );
        return;
      }

      const result = await createCheckoutSession(payload);
      await persistCustomer();
      sessionStorage.setItem("lastOrderNumber", result.orderNumber);
      sessionStorage.setItem("lastOrderEmail", customerPayload.email);
      window.location.href = result.url;
    } catch (error) {
      toastError(error, {
        title: "Checkout failed",
        fallback: "Please review your details and try again.",
      });
      idempotencyKeyRef.current = createIdempotencyKey();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-lg ring-1 ring-foreground/5">
      <CardHeader className="space-y-1 border-b border-border/60 bg-muted/20 px-5 py-6 sm:px-7">
        <CardTitle className={SHOP_SUBSECTION_TITLE}>Customer information</CardTitle>
        <CardDescription>
          Enter your details to complete your order securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-6 sm:px-7">
        <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <CheckoutFormField
            label="Full name"
            htmlFor="checkout-full-name"
            error={validation.fieldError("fullName")}
            required
          >
            <ShopInput
              id="checkout-full-name"
              name="fullName"
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
              onBlur={() => validation.touch("fullName")}
              placeholder="Your full name"
              disabled={submitting}
              aria-invalid={!!validation.fieldError("fullName")}
              className={invalidInputClass(validation.fieldError("fullName"))}
            />
          </CheckoutFormField>

          <CheckoutFormField
            label="Email address"
            htmlFor="checkout-email"
            error={validation.fieldError("email")}
            required
          >
            <ShopInput
              id="checkout-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              onBlur={() => validation.touch("email")}
              placeholder="you@example.com"
              disabled={submitting}
              aria-invalid={!!validation.fieldError("email")}
              className={invalidInputClass(validation.fieldError("email"))}
            />
          </CheckoutFormField>

          <AdminFormField
            label="Phone number"
            htmlFor="checkout-phone"
            error={validation.fieldError("phone")}
            required
          >
            <PhoneInput
              id="checkout-phone"
              value={form.phone as Value}
              onChange={(value) =>
                setForm((current) => ({ ...current, phone: value ?? "" }))
              }
              onBlur={() => validation.touch("phone")}
              disabled={submitting}
              aria-invalid={!!validation.fieldError("phone")}
              className={invalidInputClass(validation.fieldError("phone"))}
            />
          </AdminFormField>

          <CheckoutFormField
            label="Address"
            htmlFor="checkout-address"
            error={validation.fieldError("address")}
            required
          >
            <ShopTextarea
              id="checkout-address"
              name="address"
              value={form.address}
              onChange={(event) =>
                setForm((current) => ({ ...current, address: event.target.value }))
              }
              onBlur={() => validation.touch("address")}
              placeholder="Street address, city, state, postal code"
              rows={3}
              disabled={submitting}
              aria-invalid={!!validation.fieldError("address")}
              className={cn(
                invalidInputClass(validation.fieldError("address")),
                "min-h-[5.5rem] resize-y"
              )}
            />
          </CheckoutFormField>

          <CheckoutFormField
            label="Order notes"
            htmlFor="checkout-notes"
            error={validation.fieldError("notes")}
            description="Optional delivery instructions or special requests."
          >
            <ShopTextarea
              id="checkout-notes"
              name="notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              onBlur={() => validation.touch("notes")}
              placeholder="Any notes for your order?"
              rows={3}
              disabled={submitting}
              aria-invalid={!!validation.fieldError("notes")}
              className={cn(
                invalidInputClass(validation.fieldError("notes")),
                "min-h-[5rem] resize-y"
              )}
            />
          </CheckoutFormField>

          {deliveryMethods.length > 0 ? (
            <div id="checkout-delivery-methods">
            <DeliveryMethodSelector
              methods={deliveryMethods}
              value={deliveryMethod}
              onChange={(method) => onDeliveryMethodChange?.(method)}
              currency={currency}
              disabled={submitting || pricingLoading}
            />
            </div>
          ) : null}

          <PaymentMethodSelector
            value={form.paymentMethod}
            onChange={(paymentMethod: PaymentMethod) =>
              setForm((current) => ({ ...current, paymentMethod }))
            }
            onBlur={() => validation.touch("paymentMethod")}
            disabled={submitting}
            error={validation.fieldError("paymentMethod")}
          />

          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-4">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={form.termsAccepted}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    termsAccepted: checked === true,
                  }))
                }
                onBlur={() => validation.touch("termsAccepted")}
                disabled={submitting}
                aria-invalid={!!validation.fieldError("termsAccepted")}
              />
              <span className={cn("leading-relaxed text-foreground", SHOP_BODY_SM)}>
                I agree to the{" "}
                <Link href="/terms?from=checkout" className="font-medium text-[#6254f3] hover:underline">
                  Terms & Conditions
                </Link>
                ,{" "}
                <Link href="/shipping?from=checkout" className="font-medium text-[#6254f3] hover:underline">
                  Shipping Policy
                </Link>
                , and{" "}
                <Link href="/return?from=checkout" className="font-medium text-[#6254f3] hover:underline">
                  Return Policy
                </Link>
              </span>
            </label>
            {validation.fieldError("termsAccepted") ? (
              <p className="text-sm text-destructive">
                {validation.fieldError("termsAccepted")}
              </p>
            ) : null}

            <label className="flex items-start gap-3">
              <Checkbox
                checked={form.privacyAccepted}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    privacyAccepted: checked === true,
                  }))
                }
                onBlur={() => validation.touch("privacyAccepted")}
                disabled={submitting}
                aria-invalid={!!validation.fieldError("privacyAccepted")}
              />
              <span className={cn("leading-relaxed text-foreground", SHOP_BODY_SM)}>
                I agree to the{" "}
                <Link href="/privacy?from=checkout" className="font-medium text-[#6254f3] hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {validation.fieldError("privacyAccepted") ? (
              <p className="text-sm text-destructive">
                {validation.fieldError("privacyAccepted")}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-center gap-3">
            <ShopButton
              type="submit"
              disabled={submitting}
              className="group gap-2 rounded-full bg-[#6254f3] px-8 !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-50 [&_svg]:!text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing…
                </>
              ) : form.paymentMethod === "stripe" ? (
                <>
                  <Lock className="size-4" />
                  Continue to secure payment
                </>
              ) : (
                <>
                  <ShoppingBag className="size-4" />
                  Place order
                </>
              )}
            </ShopButton>
          </div>

          <p className={cn("flex items-center justify-center gap-1.5 text-center", SHOP_BODY_SM)}>
            <Lock className="size-3 shrink-0" />
            Your payment information is encrypted and secure
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
