"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastError, toastSuccess } from "@/lib/app-toast";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const subscribe = useMutation(api.subscribers.subscribe);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const result = await subscribe({ email: trimmed, source: "footer" });

      if (result.status === "already_subscribed") {
        toastSuccess("You're already subscribed", {
          description: "This email is already on our newsletter list.",
        });
      } else if (result.status === "resubscribed") {
        toastSuccess("Welcome back!", {
          description: "Your newsletter subscription is active again.",
        });
        setEmail("");
      } else {
        toastSuccess("Subscribed!", {
          description: "Thanks for joining our newsletter.",
        });
        setEmail("");
      }
    } catch (error) {
      toastError(error, {
        title: "Subscription failed",
        fallback: "Could not subscribe right now. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="mt-4 flex w-full items-stretch gap-2 sm:gap-2.5"
      onSubmit={handleSubmit}
    >
      <Input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Your email address"
        aria-label="Email for newsletter"
        disabled={submitting}
        className="h-10 min-w-0 flex-1 border-white/15 bg-white/5 text-sm text-white placeholder:text-white/40 focus-visible:border-[#6254f3]/50 focus-visible:ring-[#6254f3]/25 sm:h-11 sm:text-base"
      />
      <Button
        type="submit"
        disabled={submitting}
        className="h-10 shrink-0 bg-[#6254f3] px-4 text-sm text-white hover:bg-[#5548e0] disabled:opacity-70 sm:h-11 sm:px-6"
      >
        {submitting ? "Subscribing…" : "Subscribe"}
      </Button>
    </form>
  );
}
