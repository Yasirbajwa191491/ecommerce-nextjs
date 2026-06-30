"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type VisualSearchUploadProps = {
  onSearch: (file: File, textQuery?: string) => void;
  isLoading?: boolean;
  previewUrl?: string;
  className?: string;
};

export function VisualSearchUpload({
  onSearch,
  isLoading,
  previewUrl,
  className,
}: VisualSearchUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [textQuery, setTextQuery] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayPreview = previewUrl ?? localPreview;

  const handleFile = useCallback((file: File | null | undefined) => {
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
    setLocalPreview(URL.createObjectURL(file));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const clear = () => {
    setSelectedFile(null);
    setLocalPreview(null);
    setError(null);
  };

  const submit = () => {
    if (!selectedFile || isLoading) return;
    onSearch(selectedFile, textQuery.trim() || undefined);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 bg-muted/30"
        )}
      >
        {displayPreview ? (
          <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-lg">
            <Image
              src={displayPreview}
              alt="Upload preview"
              fill
              className="object-contain"
              unoptimized
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 size-8"
              onClick={clear}
              aria-label="Remove image"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <ImageIcon className="size-10 text-muted-foreground" />
            <p className="text-center text-sm text-muted-foreground">
              Drag and drop an image, or use the buttons below
            </p>
          </>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
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
            onClick={() => cameraRef.current?.click()}
            disabled={isLoading}
          >
            <Camera className="size-4" />
            Camera
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={ACCEPT}
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="visual-text-query">
          Optional: refine with text (e.g. &quot;under $300&quot;, &quot;gold&quot;)
        </Label>
        <Input
          id="visual-text-query"
          value={textQuery}
          onChange={(e) => setTextQuery(e.target.value)}
          placeholder="Add keywords or filters in natural language"
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="default"
          disabled={!selectedFile || isLoading}
          onClick={submit}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </>
          ) : (
            "Search by image"
          )}
        </Button>
      </div>
    </div>
  );
}
