"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { invalidInputClass } from "@/components/admin/admin-form-field";
import { toastError } from "@/lib/app-toast";
import { cn } from "@/lib/utils";
import { ImagePlus, Link2, Plus, Upload, X } from "lucide-react";

type ProductImageFieldProps = {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
  error?: string;
  onBlur?: (index: number) => void;
  fieldErrors?: Record<number, string | undefined>;
};

export function ProductImageField({
  imageUrls,
  onChange,
  error,
  onBlur,
  fieldErrors = {},
}: ProductImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.products.generateImageUploadUrl);
  const resolveImageUrl = useMutation(api.products.resolveImageUrlFromStorage);

  const validUrls = imageUrls.map((u) => u.trim()).filter(Boolean);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      toastError("Please choose image files", { title: "Invalid file" });
      return;
    }
    for (const file of list) {
      if (file.size > 5 * 1024 * 1024) {
        toastError(`${file.name} must be smaller than 5MB`, {
          title: "File too large",
        });
        return;
      }
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = (await response.json()) as { storageId?: string };
        if (!data.storageId) throw new Error("Upload failed");
        const { url } = await resolveImageUrl({
          storageId: data.storageId as Id<"_storage">,
        });
        uploaded.push(url);
      }
      const merged = [...validUrls, ...uploaded];
      onChange(merged.length ? merged : [""]);
    } catch (e) {
      toastError(e, {
        title: "Couldn't upload image",
        fallback: "Failed to upload image. Please try again.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeUrl = (index: number) => {
    const next = imageUrls.filter((_, i) => i !== index);
    onChange(next.length ? next : [""]);
  };

  return (
    <div className="space-y-3">
      <Tabs defaultValue="upload">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="upload" className="gap-1.5">
            <Upload className="size-3.5" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-1.5">
            <Link2 className="size-3.5" />
            URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3 space-y-3">
          <div
            className={cn(
              "flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-6",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? (
              <>
                <Spinner className="size-6" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <ImagePlus className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  JPG, PNG, WEBP up to 5MB each
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose images
                </Button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files?.length) void uploadFiles(e.target.files);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-3 space-y-2">
          {imageUrls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={url}
                placeholder="https://..."
                onChange={(e) => {
                  const next = [...imageUrls];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                onBlur={() => onBlur?.(i)}
                aria-invalid={!!fieldErrors[i]}
                className={invalidInputClass(fieldErrors[i])}
              />
              {imageUrls.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUrl(i)}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...imageUrls, ""])}
          >
            <Plus className="mr-1 size-4" />
            Add image URL
          </Button>
        </TabsContent>
      </Tabs>

      {validUrls.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {validUrls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              <Image
                src={url}
                alt={`Product image ${i + 1}`}
                fill
                className="object-contain object-center p-1"
                unoptimized
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-1 right-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => {
                  const idx = imageUrls.findIndex(
                    (u, j) => u.trim() === url && j >= i
                  );
                  removeUrl(idx >= 0 ? idx : i);
                }}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
