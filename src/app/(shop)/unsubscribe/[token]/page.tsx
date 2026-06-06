"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError } from "@/lib/app-toast";
import Link from "next/link";

export default function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const subscriber = useQuery(api.subscribers.getByUnsubscribeToken, { token });
  const unsubscribe = useMutation(api.subscribers.unsubscribeByToken);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUnsubscribe = async () => {
    setSubmitting(true);
    try {
      const result = await unsubscribe({ token });
      if (
        result.status === "unsubscribed" ||
        result.status === "already_unsubscribed"
      ) {
        setDone(true);
      }
    } catch (error) {
      toastError(error, { title: "Unsubscribe failed" });
    } finally {
      setSubmitting(false);
    }
  };

  if (subscriber === undefined) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (subscriber === null) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>This unsubscribe link is invalid or has expired.</p>
            <Button variant="outline" render={<Link href="/home" />}>
              Return to store
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done || !subscriber.active) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re unsubscribed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{subscriber.email}</span>{" "}
              will no longer receive marketing emails from us.
            </p>
            <Button variant="outline" render={<Link href="/home" />}>
              Return to store
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Unsubscribe from newsletter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click below to unsubscribe{" "}
            <span className="font-medium text-foreground">{subscriber.email}</span> from
            our marketing emails. You can resubscribe anytime from our website footer.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleUnsubscribe} disabled={submitting}>
              {submitting ? "Processing..." : "Confirm Unsubscribe"}
            </Button>
            <Button variant="outline" render={<Link href="/home" />}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
