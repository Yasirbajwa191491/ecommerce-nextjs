"use client";

import dynamic from "next/dynamic";

export const VapiAssistantWidgetLoader = dynamic(
  () =>
    import("@/components/vapi/vapi-assistant-widget").then((mod) => ({
      default: mod.VapiAssistantWidget,
    })),
  { ssr: false }
);
