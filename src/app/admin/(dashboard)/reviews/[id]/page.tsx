"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductStars } from "@/components/products/product-stars";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { ArrowLeft, Check, Trash2, X } from "lucide-react";

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default function AdminReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.id as Id<"productReviews">;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const detail = useQuery(api.adminReviews.getById, { id: reviewId });
  const approve = useMutation(api.adminReviews.approve);
  const reject = useMutation(api.adminReviews.reject);
  const remove = useMutation(api.adminReviews.remove);

  const handleApprove = async () => {
    setSaving(true);
    try {
      await approve({ id: reviewId });
      toastSuccess("Review approved");
    } catch (error) {
      toastError(error, { title: "Couldn't approve review" });
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      await reject({ id: reviewId });
      toastSuccess("Review rejected");
    } catch (error) {
      toastError(error, { title: "Couldn't reject review" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await remove({ id: reviewId });
      toastSuccess("Review deleted");
      router.push("/admin/reviews");
    } catch (error) {
      toastError(error, { title: "Couldn't delete review" });
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  };

  if (detail === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" render={<Link href="/admin/reviews" />}>
          <ArrowLeft className="size-4" />
          Back to reviews
        </Button>
        <p className="text-muted-foreground">Review not found.</p>
      </div>
    );
  }

  const { review, product, order, imageUrls, purchaseVerification } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          title={review.title}
          description={`Submitted ${formatDate(review.createdAt)}`}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/admin/reviews" />}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {!review.isApproved ? (
            <Button onClick={() => void handleApprove()} disabled={saving}>
              <Check className="size-4" />
              Approve
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => void handleReject()}
              disabled={saving}
            >
              <X className="size-4" />
              Reject
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={saving}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ProductStars rating={review.rating} />
        {review.isApproved ? (
          <Badge className="bg-emerald-600">Approved</Badge>
        ) : (
          <Badge variant="outline">Pending approval</Badge>
        )}
        {review.isVerifiedPurchase ? (
          <Badge variant="secondary">Verified purchase</Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {product ? (
              <>
                <div className="flex items-center gap-3">
                  {product.imageUrl ? (
                    <div className="relative size-14 overflow-hidden rounded-lg border">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ) : null}
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-muted-foreground">{product.company}</p>
                  </div>
                </div>
                <Button
                  variant="link"
                  className="h-auto p-0"
                  render={<Link href={`/product/${product._id}`} />}
                >
                  View on storefront
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Product unavailable</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{review.customerName}</p>
            <p className="text-muted-foreground">{review.customerEmail}</p>
            {order ? (
              <Button
                variant="link"
                className="h-auto p-0"
                render={<Link href={`/admin/orders/${order._id}`} />}
              >
                Order {order.orderNumber}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap leading-relaxed">{review.content}</p>
          {imageUrls.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {imageUrls.map((url: string) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative size-24 overflow-hidden rounded-xl border"
                >
                  <Image
                    src={url}
                    alt="Review image"
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </a>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase verification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Verified purchase</p>
            <p className="font-medium">
              {purchaseVerification.isVerifiedPurchase ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Product in order</p>
            <p className="font-medium">
              {purchaseVerification.productInOrder ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Order delivered</p>
            <p className="font-medium">
              {purchaseVerification.orderDelivered ? "Yes" : "No"}
            </p>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete review"
        description="This permanently removes the review."
        onConfirm={() => void handleDelete()}
        loading={saving}
      />
    </div>
  );
}
