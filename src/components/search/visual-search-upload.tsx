"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImageIcon, Loader2, Search, Upload, X } from "lucide-react";
import { VisualSearchCameraSheet } from "@/components/search/visual-search-camera-sheet";
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
import { Separator } from "@/components/ui/separator";
import {
  OUTLINE_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "@/lib/layout-constants";
import { SHOP_BODY_SM, SHOP_META_LABEL } from "@/lib/typography";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type VisualSearchUploadProps = {
  onSearch: (file: File, textQuery?: string) => void;
  onClear?: () => void;
  isLoading?: boolean;
  className?: string;
};

export function VisualSearchUpload({
  onSearch,
  onClear,
  isLoading,
  className,
}: VisualSearchUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [textQuery, setTextQuery] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const setPreviewFromFile = useCallback(
    (file: File) => {
      revokePreview();
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    },
    [revokePreview]
  );

  useEffect(() => () => revokePreview(), [revokePreview]);

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Image must be 5MB or smaller.");
        return;
      }
      setSelectedFile(file);
      setPreviewFromFile(file);
    },
    [setPreviewFromFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const clear = () => {
    revokePreview();
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  };

  const submit = () => {
    if (!selectedFile || isLoading) return;
    onSearch(selectedFile, textQuery.trim() || undefined);
  };

  const hasCameraApi =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  return (
    <>
      <Card className={cn("overflow-hidden border-border/80 shadow-sm", className)}>
        <CardHeader className="border-b bg-muted/30 pb-4">
          <CardTitle className="text-base font-semibold sm:text-lg">
            Upload or capture a product photo
          </CardTitle>
          <CardDescription>
            We&apos;ll find visually similar items in our catalog. Add optional
            text to refine results.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "relative flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-6 transition-colors",
              dragOver
                ? "border-[#6254f3]/50 bg-[#6254f3]/5"
                : "border-border/80 bg-muted/20"
            )}
          >
            {previewUrl ? (
              <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
                <Image
                  src={previewUrl}
                  alt="Upload preview"
                  fill
                  className="object-contain p-2"
                  unoptimized
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="absolute top-2 right-2 z-10 size-8 rounded-full shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    clear();
                  }}
                  aria-label="Remove image"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-[#6254f3]/10 text-[#6254f3]">
                  <ImageIcon className="size-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Drag and drop an image here
                  </p>
                  <p className={SHOP_BODY_SM}>JPG, PNG, WebP or GIF · up to 5MB</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="default"
                className={OUTLINE_BUTTON_CLASS}
                onClick={() => inputRef.current?.click()}
                disabled={isLoading}
              >
                <Upload className="size-4" />
                Upload image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="default"
                className={OUTLINE_BUTTON_CLASS}
                onClick={() => {
                  if (hasCameraApi) {
                    setCameraOpen(true);
                  } else if (inputRef.current) {
                    inputRef.current.setAttribute("capture", "environment");
                    inputRef.current.click();
                  }
                }}
                disabled={isLoading}
              >
                <Camera className="size-4" />
                {hasCameraApi ? "Use camera" : "Camera"}
              </Button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="visual-text-query" className={SHOP_META_LABEL}>
              Refine with text (optional)
            </Label>
            <Input
              id="visual-text-query"
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              placeholder='e.g. "under $300", "gold", "wireless"'
              disabled={isLoading}
              className="h-10"
            />
            <p className={SHOP_BODY_SM}>
              Combine your photo with price, color, or style keywords.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className={PRIMARY_BUTTON_CLASS}
              disabled={!selectedFile || isLoading}
              onClick={submit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="size-4" />
                  Search by image
                </>
              )}
            </Button>
            {selectedFile ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clear}
                disabled={isLoading}
              >
                Clear image
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <VisualSearchCameraSheet
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleFile}
      />
    </>
  );
}
