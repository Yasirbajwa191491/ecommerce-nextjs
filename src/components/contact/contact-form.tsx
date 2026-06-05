"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/lib/app-toast";

const emptyForm = {
  name: "",
  email: "",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const submit = useMutation(api.contactMessages.submit);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await submit({
        name: form.name,
        email: form.email,
        message: form.message,
      });
      toastSuccess("Message sent!", {
        description: "Thanks for reaching out. We'll reply within 1–2 business days.",
      });
      setForm(emptyForm);
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
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input
              id="contact-name"
              name="name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Your full name"
              required
              disabled={submitting}
              className="h-11"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="you@example.com"
              required
              disabled={submitting}
              className="h-11"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contact-message">Message</Label>
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
              placeholder="How can we help you today?"
              rows={6}
              required
              disabled={submitting}
              className="min-h-[9rem] resize-y"
            />
          </div>

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
