"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Search, Upload, X } from "lucide-react";
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
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
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
    if (uploadInputRef.current) uploadInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    onClear?.();
  };

  const submit = () => {
    if (!selectedFile || isLoading) return;
    onSearch(selectedFile, textQuery.trim() || undefined);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-sm", className)}>
      <CardHeader className="border-b bg-muted/30 pb-4">
        <CardTitle className="text-base font-semibold sm:text-lg">
          {selectedFile ? "Review your image" : "Upload or capture a product photo"}
        </CardTitle>
        <CardDescription>
          {selectedFile
            ? "Confirm your upload, optionally refine with text, then search for similar products."
            : "We'll find visually similar items in our catalog. Add optional text to refine results."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {!selectedFile ? (
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
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-[#6254f3]/10 text-[#6254f3]">
                <Upload className="size-7" strokeWidth={1.75} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Drag and drop an image here
                </p>
                <p className={SHOP_BODY_SM}>JPG, PNG, WebP or GIF · up to 5MB</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="default"
                className={OUTLINE_BUTTON_CLASS}
                onClick={() => uploadInputRef.current?.click()}
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
                onClick={() => cameraInputRef.current?.click()}
                disabled={isLoading}
              >
                <Camera className="size-4" />
                Take photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className={SHOP_META_LABEL}>Uploaded image</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clear}
                disabled={isLoading}
                className="h-8 gap-1.5 text-muted-foreground"
              >
                <X className="size-3.5" />
                Remove
              </Button>
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Uploaded product preview"
                  fill
                  className="object-contain p-3"
                  unoptimized
                />
              ) : null}
            </div>
            <p className={cn("text-center", SHOP_BODY_SM)}>
              {selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB
            </p>
          </div>
        )}

        <input
          ref={uploadInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onFileInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onFileInputChange}
        />

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {selectedFile ? (
          <>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="visual-text-query" className={SHOP_META_LABEL}>
                Optional refinement
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
                disabled={isLoading}
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
                    Search visually similar products
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={OUTLINE_BUTTON_CLASS}
                onClick={() => uploadInputRef.current?.click()}
                disabled={isLoading}
              >
                Change image
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
