"use client";

import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

export default function ContactPage() {
  return (
    <section className="container mx-auto max-w-xl px-4 py-24">
      <Alert className="mb-8">
        <AlertTitle>We&apos;re here to help</AlertTitle>
        <AlertDescription>
          Send a message and we&apos;ll get back to you within 1–2 business days.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Contact us</CardTitle>
          <CardDescription>Fill in the form below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Message sent!", {
                description: "Thanks for reaching out to Ecommerce Store.",
              });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Your name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="How can we help?"
                rows={5}
                required
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Send message
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
