"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { invalidInputClass } from "@/components/admin/admin-form-field";
import { toastError } from "@/lib/app-toast";
import { cn } from "@/lib/utils";
import { ImagePlus, Link2, Plus, Star, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ProductImageFieldProps = {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
  imageAlts?: string[];
  onAltsChange?: (alts: string[]) => void;
  primaryIndex?: number;
  onPrimaryIndexChange?: (index: number) => void;
  productName?: string;
  error?: string;
  onBlur?: (index: number) => void;
  fieldErrors?: Record<number, string | undefined>;
};

function syncAltsToUrls(urls: string[], alts: string[] = []): string[] {
  return urls.map((_, i) => alts[i] ?? "");
}

export function ProductImageField({
  imageUrls,
  onChange,
  imageAlts = [],
  onAltsChange,
  primaryIndex = 0,
  onPrimaryIndexChange,
  productName = "Product",
  error,
  onBlur,
  fieldErrors = {},
}: ProductImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.products.generateImageUploadUrl);
  const resolveImageUrl = useMutation(api.products.resolveImageUrlFromStorage);

  const validUrlEntries = imageUrls
    .map((url, index) => ({ url: url.trim(), index }))
    .filter((entry) => entry.url.length > 0);

  const updateUrls = (nextUrls: string[]) => {
    onChange(nextUrls);
    onAltsChange?.(syncAltsToUrls(nextUrls, imageAlts));
  };

  const updateAlt = (index: number, value: string) => {
    if (!onAltsChange) return;
    const next = syncAltsToUrls(imageUrls, imageAlts);
    next[index] = value;
    onAltsChange(next);
  };

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
      const trimmed = imageUrls.map((u) => u.trim()).filter(Boolean);
      const merged = [...trimmed, ...uploaded];
      updateUrls(merged.length ? merged : [""]);
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
    const nextUrls = imageUrls.filter((_, i) => i !== index);
    const nextAlts = imageAlts.filter((_, i) => i !== index);
    onChange(nextUrls.length ? nextUrls : [""]);
    onAltsChange?.(nextAlts.length ? nextAlts : [""]);
    if (onPrimaryIndexChange) {
      const validCount = nextUrls.filter((u) => u.trim()).length;
      if (validCount === 0) {
        onPrimaryIndexChange(0);
      } else if (index === primaryIndex) {
        onPrimaryIndexChange(0);
      } else if (index < primaryIndex) {
        onPrimaryIndexChange(Math.max(0, primaryIndex - 1));
      }
    }
  };

  const resolveDisplayPrimary = (urls: string[]) => {
    const validIndices = urls
      .map((url, i) => (url.trim() ? i : -1))
      .filter((i) => i >= 0);
    if (validIndices.length === 0) return 0;
    if (validIndices.includes(primaryIndex)) return primaryIndex;
    return validIndices[0]!;
  };

  const displayPrimary = resolveDisplayPrimary(imageUrls);

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
                  updateUrls(next);
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
            onClick={() => updateUrls([...imageUrls, ""])}
          >
            <Plus className="mr-1 size-4" />
            Add image URL
          </Button>
        </TabsContent>
      </Tabs>

      {validUrlEntries.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Click an image to set it as the default storefront image.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {validUrlEntries.map(({ url, index }) => {
              const isDefault = index === displayPrimary;
              return (
              <div
                key={`${url}-${index}`}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-md border bg-muted",
                  isDefault && "ring-2 ring-primary",
                  onPrimaryIndexChange && !isDefault && "cursor-pointer hover:ring-2 hover:ring-primary/50"
                )}
                onClick={() => {
                  if (!onPrimaryIndexChange || isDefault) return;
                  onPrimaryIndexChange(index);
                }}
                onKeyDown={(event) => {
                  if (!onPrimaryIndexChange || isDefault) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPrimaryIndexChange(index);
                  }
                }}
                role={onPrimaryIndexChange && !isDefault ? "button" : undefined}
                tabIndex={onPrimaryIndexChange && !isDefault ? 0 : undefined}
                aria-label={
                  onPrimaryIndexChange && !isDefault
                    ? `Set image ${index + 1} as default`
                    : undefined
                }
              >
                {isDefault ? (
                  <Badge
                    variant="secondary"
                    className="absolute top-1 left-1 z-10 gap-0.5 px-1.5 py-0 text-[10px]"
                  >
                    <Star className="size-2.5 fill-current" />
                    Default
                  </Badge>
                ) : null}
                <Image
                  src={url}
                  alt={imageAlts[index]?.trim() || productName}
                  fill
                  className="object-contain object-center p-1"
                  unoptimized
                />
                <div className="absolute inset-x-1 bottom-1 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="ml-auto size-6"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeUrl(index);
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            );
            })}
          </div>

          {onAltsChange ? (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Image alt text (accessibility & SEO)
              </Label>
              {validUrlEntries.map(({ url, index }) => (
                <Input
                  key={`alt-${url}-${index}`}
                  value={imageAlts[index] ?? ""}
                  placeholder={`Alt text for image ${index + 1}`}
                  onChange={(e) => updateAlt(index, e.target.value)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
