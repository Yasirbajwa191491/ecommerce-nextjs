"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminQrScannerProps = {
  onDetect: (value: string) => void;
  disabled?: boolean;
};

export function AdminQrScanner({ onDetect, disabled }: AdminQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lockRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active || disabled) return;
    let stream: MediaStream | undefined;
    let raf = 0;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!videoRef.current || cancelled) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector =
          "BarcodeDetector" in window
            ? new window.BarcodeDetector({ formats: ["qr_code"] })
            : null;

        const tick = async () => {
          if (cancelled || lockRef.current || !videoRef.current) return;
          const video = videoRef.current;
          if (video.readyState >= 2) {
            if (detector) {
              const codes = await detector.detect(video);
              const raw = codes[0]?.rawValue;
              if (raw) {
                lockRef.current = true;
                onDetect(raw);
                setTimeout(() => {
                  lockRef.current = false;
                }, 1500);
              }
            } else if (canvasRef.current) {
              const canvas = canvasRef.current;
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const context = canvas.getContext("2d");
              if (context) {
                context.drawImage(video, 0, 0);
                const image = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(image.data, image.width, image.height);
                if (code?.data) {
                  lockRef.current = true;
                  onDetect(code.data);
                  setTimeout(() => {
                    lockRef.current = false;
                  }, 1500);
                }
              }
            }
          }
          raf = window.requestAnimationFrame(() => {
            void tick();
          });
        };
        raf = window.requestAnimationFrame(() => {
          void tick();
        });
      } catch {
        setError("Camera access is required to scan QR codes in this browser.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, disabled, onDetect]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950">
        <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-48 rounded-xl border-2 border-white/80" />
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" variant="outline" onClick={() => setActive(true)} disabled={disabled}>
        {active ? "Camera on" : "Start camera"}
      </Button>
      <div className="space-y-2">
        <Label htmlFor="admin-qr-manual">Or paste a QR link</Label>
        <div className="flex gap-2">
          <Input
            id="admin-qr-manual"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="https://yourstore.com/qr/package/…"
          />
          <Button type="button" onClick={() => onDetect(manual)} disabled={disabled || !manual.trim()}>
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    BarcodeDetector: {
      new (options?: { formats?: string[] }): {
        detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
      };
    };
  }
}
