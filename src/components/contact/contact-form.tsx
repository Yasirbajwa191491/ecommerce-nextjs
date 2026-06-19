"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { ShopButton, ShopInput, ShopLabel, ShopTextarea } from "@/components/shop";
import {
  Field,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFormValidation } from "@/hooks/use-form-validation";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { SHOP_SUBSECTION_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";
import {
  validateContactForm,
  type ContactFormValues,
} from "@/lib/validation/contact-form";

const emptyForm = (): ContactFormValues => ({
  name: "",
  email: "",
  message: "",
});

function ContactFormField({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
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
        <FieldError>{error}</FieldError>
      </FieldContent>
    </Field>
  );
}

function invalidInputClass(error?: string) {
  return cn(
    error &&
      "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20"
  );
}

export function ContactForm() {
  const [form, setForm] = useState<ContactFormValues>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const submit = useMutation(api.contactMessages.submit);

  const validate = useCallback(
    (values: ContactFormValues) => validateContactForm(values),
    []
  );
  const validation = useFormValidation(form, validate);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validation.validateAll()) return;

    setSubmitting(true);

    try {
      await submit({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      toastSuccess("Message sent!", {
        description:
          "Thanks for reaching out. We'll reply within 1–2 business days.",
      });
      setForm(emptyForm());
      validation.reset();
    } catch (error) {
      toastError(error, {
        title: "Couldn't send message",
        fallback: "Please check your details and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1 px-5 pt-6 sm:px-6">
        <CardTitle className={SHOP_SUBSECTION_TITLE}>Send us a message</CardTitle>
        <CardDescription>
          Fill in the form below and our team will get back to you shortly.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-6 sm:px-6">
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={handleSubmit}
        >
          <ContactFormField
            label="Name"
            htmlFor="contact-name"
            error={validation.fieldError("name")}
            required
          >
            <ShopInput
              id="contact-name"
              name="name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              onBlur={() => validation.touch("name")}
              placeholder="Your full name"
              disabled={submitting}
              aria-invalid={!!validation.fieldError("name")}
              className={invalidInputClass(validation.fieldError("name"))}
            />
          </ContactFormField>

          <ContactFormField
            label="Email"
            htmlFor="contact-email"
            error={validation.fieldError("email")}
            required
          >
            <ShopInput
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              onBlur={() => validation.touch("email")}
              placeholder="you@example.com"
              disabled={submitting}
              aria-invalid={!!validation.fieldError("email")}
              className={invalidInputClass(validation.fieldError("email"))}
            />
          </ContactFormField>

          <ContactFormField
            label="Message"
            htmlFor="contact-message"
            error={validation.fieldError("message")}
            required
          >
            <ShopTextarea
              id="contact-message"
              name="message"
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              onBlur={() => validation.touch("message")}
              placeholder="How can we help you today?"
              rows={6}
              disabled={submitting}
              aria-invalid={!!validation.fieldError("message")}
              className={cn(
                invalidInputClass(validation.fieldError("message")),
                "min-h-[9rem] resize-y"
              )}
            />
          </ContactFormField>

          <ShopButton
            type="submit"
            disabled={submitting}
            className="w-full gap-2 bg-[#6254f3] text-white hover:bg-[#5548e0] sm:w-auto sm:self-start"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="size-4" />
                Send message
              </>
            )}
          </ShopButton>
        </form>
      </CardContent>
    </Card>
  );
}
