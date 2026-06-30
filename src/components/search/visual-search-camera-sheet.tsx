"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PRIMARY_BUTTON_CLASS } from "@/lib/layout-constants";

type VisualSearchCameraSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
};

export function VisualSearchCameraSheet({
  open,
  onOpenChange,
  onCapture,
}: VisualSearchCameraSheetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setStarting(true);
    stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser.");
      setStarting(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError(
        "Could not access the camera. Check permissions or use Upload image instead."
      );
    } finally {
      setStarting(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (open) {
      void startCamera();
    } else {
      stopStream();
      setError(null);
    }
    return () => stopStream();
  }, [open, startCamera, stopStream]);

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    const file = new File([blob], `visual-search-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onCapture(file);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Take a photo</SheetTitle>
          <SheetDescription>
            Point your camera at a product to find similar items.
          </SheetDescription>
        </SheetHeader>

        <div className="relative mx-auto mt-2 aspect-[4/3] w-full max-w-lg overflow-hidden rounded-xl bg-black">
          {starting ? (
            <div className="flex h-full items-center justify-center text-white">
              <Loader2 className="size-8 animate-spin" />
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="size-full object-cover"
            />
          )}
        </div>

        {error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <SheetFooter className="mt-4 flex-row justify-end gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            disabled={Boolean(error) || starting}
            onClick={() => void capturePhoto()}
          >
            <Camera className="size-4" />
            Capture
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
