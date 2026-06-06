"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

type EmailPreviewProps = {
  html: string;
  className?: string;
};

function PreviewFrame({
  html,
  width,
  label,
}: {
  html: string;
  width: number;
  label: string;
}) {
  const resizeIframe = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe?.contentDocument?.documentElement) return;
    const doc = iframe.contentDocument.documentElement;
    const height = Math.max(doc.scrollHeight, doc.offsetHeight, 320);
    iframe.style.height = `${height}px`;
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div
        className="max-h-[min(70vh,640px)] overflow-y-auto overscroll-contain rounded-lg border bg-muted/30"
        style={{ maxWidth: width }}
      >
        <iframe
          title={`${label} email preview`}
          srcDoc={wrapPreviewHtml(html)}
          onLoad={(event) => resizeIframe(event.currentTarget)}
          className="block w-full border-0 bg-white"
          style={{ width, minHeight: 320 }}
        />
      </div>
    </div>
  );
}

function wrapPreviewHtml(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;padding:16px;font-family:system-ui,sans-serif;color:#374151;overflow:visible;}img{max-width:100%;height:auto;}a{color:#111827;}p,li{overflow-wrap:anywhere;}</style></head><body>${body}</body></html>`;
}

export function EmailPreview({ html, className }: EmailPreviewProps) {
  if (!html.trim()) {
    return (
      <div className={cn("rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground", className)}>
        Email preview will appear here once you add content.
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6 lg:grid-cols-2", className)}>
      <PreviewFrame html={html} width={600} label="Desktop (600px)" />
      <PreviewFrame html={html} width={375} label="Mobile (375px)" />
    </div>
  );
}
