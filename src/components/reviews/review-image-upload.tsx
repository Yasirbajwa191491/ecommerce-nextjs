"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toastError } from "@/lib/app-toast";
import { ImagePlus, X } from "lucide-react";

const MAX_IMAGES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

type ReviewImageUploadProps = {
  orderNumber: string;
  customerEmail: string;
  productId: Id<"products">;
  storageIds: Id<"_storage">[];
  previewUrls: string[];
  onChange: (storageIds: Id<"_storage">[], previewUrls: string[]) => void;
  disabled?: boolean;
};

export function ReviewImageUpload({
  orderNumber,
  customerEmail,
  productId,
  storageIds,
  previewUrls,
  onChange,
  disabled,
}: ReviewImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(
    api.productReviews.generateReviewImageUploadUrl
  );

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    if (list.length === 0) {
      toastError("Use JPG, PNG, or WEBP images only", {
        title: "Invalid file",
      });
      return;
    }
    if (storageIds.length + list.length > MAX_IMAGES) {
      toastError(`Maximum ${MAX_IMAGES} images per review`, {
        title: "Too many images",
      });
      return;
    }

    setUploading(true);
    try {
      const nextIds = [...storageIds];
      const nextUrls = [...previewUrls];
      for (const file of list) {
        if (file.size > MAX_SIZE) {
          toastError(`${file.name} must be smaller than 5MB`, {
            title: "File too large",
          });
          continue;
        }
        const uploadUrl = await generateUploadUrl({
          orderNumber,
          customerEmail,
          productId,
        });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = (await response.json()) as { storageId?: string };
        if (!data.storageId) throw new Error("Upload failed");
        const id = data.storageId as Id<"_storage">;
        nextIds.push(id);
        nextUrls.push(URL.createObjectURL(file));
      }
      onChange(nextIds, nextUrls);
    } catch (error) {
      toastError(error, {
        title: "Couldn't upload image",
        fallback: "Failed to upload image. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) => {
    const nextIds = storageIds.filter((_, i) => i !== index);
    const nextUrls = previewUrls.filter((_, i) => i !== index);
    onChange(nextIds, nextUrls);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        Photos <span className="font-normal text-muted-foreground">(optional)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {previewUrls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative size-20 overflow-hidden rounded-xl border"
          >
            <Image
              src={url}
              alt="Upload preview"
              fill
              className="object-cover"
              sizes="80px"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAt(index)}
              className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {storageIds.length < MAX_IMAGES ? (
          <Button
            type="button"
            variant="outline"
            className="size-20 flex-col gap-1 rounded-xl"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Spinner className="size-5" />
            ) : (
              <>
                <ImagePlus className="size-5" />
                <span className="text-[10px]">Add</span>
              </>
            )}
          </Button>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
