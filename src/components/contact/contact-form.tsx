"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  AdminFormField,
  invalidInputClass,
} from "@/components/admin/admin-form-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormValidation } from "@/hooks/use-form-validation";
import { toastError, toastSuccess } from "@/lib/app-toast";
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
        <CardTitle className="text-xl sm:text-2xl">Send us a message</CardTitle>
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
          <AdminFormField
            label="Name"
            htmlFor="contact-name"
            error={validation.fieldError("name")}
            required
          >
            <Input
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
              className={cn(invalidInputClass(validation.fieldError("name")), "h-11")}
            />
          </AdminFormField>

          <AdminFormField
            label="Email"
            htmlFor="contact-email"
            error={validation.fieldError("email")}
            required
          >
            <Input
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
              className={cn(invalidInputClass(validation.fieldError("email")), "h-11")}
            />
          </AdminFormField>

          <AdminFormField
            label="Message"
            htmlFor="contact-message"
            error={validation.fieldError("message")}
            required
          >
            <Textarea
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
          </AdminFormField>

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full gap-2 bg-[#6254f3] text-white hover:bg-[#5548e0] sm:w-auto sm:self-start"
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
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
