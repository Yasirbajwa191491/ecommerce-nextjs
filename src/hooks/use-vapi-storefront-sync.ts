"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCartContext } from "@/context/cart_context";
import { useVapiCartSync } from "@/hooks/use-vapi-cart-sync";
import { cartItemsToCheckoutLines } from "@/lib/cart-lines";
import { productPath } from "@/lib/product-url";
import type { VapiToolEvent } from "@/lib/vapi-activity";
import type { CheckoutProgressPhase, UiAction } from "@/lib/vapi-ui-actions/types";

type CartLineSnapshot = {
  productId: Id<"products">;
  color: string;
  quantity: number;
};

export type ServerToolCompleteEvent = VapiToolEvent;

function cartFingerprint(lines: CartLineSnapshot[]): string {
  return [...lines]
    .map((line) => `${line.productId}:${line.color}:${line.quantity}`)
    .sort()
    .join("|");
}

function parseToolInputRecord(toolInput: string | null): Record<string, unknown> {
  if (!toolInput?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(toolInput);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}

function parseToolOutputValue(toolOutput: string | null): unknown {
  if (!toolOutput?.trim()) return null;
  try {
    return JSON.parse(toolOutput) as unknown;
  } catch {
    return toolOutput;
  }
}

export function useVapiStorefrontSync(options: {
  vapiCallId: string | null;
  voiceSessionActive: boolean;
  onServerToolComplete?: (event: ServerToolCompleteEvent) => void;
  onResolvedCallId?: (callId: string) => void;
  onCheckoutBackupActions?: (actions: UiAction[]) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { cart } = useCartContext();
  const { replaceCartFromVoice } = useVapiCartSync();
  const pushBrowserCartToVoice = useMutation(
    api.vapi.voiceCartSync.pushBrowserCartToVoice
  );

  const boundCallIdRef = useRef<string | null>(null);
  const lastCartSyncRef = useRef<number | null>(null);
  const lastProductNavRef = useRef<string | null>(null);
  const lastCartNavRef = useRef<number | null>(null);
  const lastCheckoutNavRef = useRef<number | null>(null);
  const lastBrowserPushRef = useRef<string | null>(null);
  const processedToolLogIdsRef = useRef<Set<string>>(new Set());
  const syncingFromVoiceRef = useRef(false);
  const onCheckoutBackupRef = useRef(options.onCheckoutBackupActions);
  onCheckoutBackupRef.current = options.onCheckoutBackupActions;
  const onServerToolCompleteRef = useRef(options.onServerToolComplete);
  onServerToolCompleteRef.current = options.onServerToolComplete;
  const onResolvedCallIdRef = useRef(options.onResolvedCallId);
  onResolvedCallIdRef.current = options.onResolvedCallId;
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (options.voiceSessionActive && sessionStartedAt === null) {
      setSessionStartedAt(Date.now());
    }
    if (!options.voiceSessionActive) {
      setSessionStartedAt(null);
    }
  }, [options.voiceSessionActive, sessionStartedAt]);

  const sessionActive = options.voiceSessionActive || Boolean(options.vapiCallId);

  const sync = useQuery(
    api.vapi.voiceStorefrontSync.getStorefrontSyncForSession,
    sessionActive
      ? {
          vapiCallId: options.vapiCallId ?? undefined,
          voiceSessionActive: options.voiceSessionActive,
          sinceMs: sessionStartedAt ?? undefined,
        }
      : "skip"
  );

  const browserFingerprint = useMemo(
    () => cartFingerprint(cartItemsToCheckoutLines(cart)),
    [cart]
  );
  const browserLines = useMemo(
    () => cartItemsToCheckoutLines(cart),
    [cart]
  );

  const effectiveCallId =
    options.vapiCallId ?? sync?.resolvedCallId ?? null;

  useEffect(() => {
    if (effectiveCallId !== boundCallIdRef.current) {
      boundCallIdRef.current = effectiveCallId;
      lastCartSyncRef.current = null;
      lastProductNavRef.current = null;
      lastCartNavRef.current = null;
      lastCheckoutNavRef.current = null;
      lastBrowserPushRef.current = null;
      processedToolLogIdsRef.current = new Set();
    }
  }, [effectiveCallId]);

  useEffect(() => {
    if (
      sync?.resolvedCallId &&
      !options.vapiCallId &&
      options.voiceSessionActive
    ) {
      onResolvedCallIdRef.current?.(sync.resolvedCallId);
    }
  }, [options.vapiCallId, options.voiceSessionActive, sync?.resolvedCallId]);

  useEffect(() => {
    if (!sync?.completedTools?.length || !onServerToolCompleteRef.current) return;

    for (const tool of sync.completedTools) {
      const logKey = String(tool.logId);
      if (processedToolLogIdsRef.current.has(logKey)) continue;
      processedToolLogIdsRef.current.add(logKey);

      const parameters = parseToolInputRecord(tool.toolInput);
      const result = parseToolOutputValue(tool.toolOutput);
      onServerToolCompleteRef.current({
        toolCallId: logKey,
        toolName: tool.toolName,
        parameters,
        result,
      });
    }
  }, [sync?.completedTools]);

  useEffect(() => {
    if (!sessionActive || !effectiveCallId) {
      if (!sessionActive) {
        boundCallIdRef.current = null;
        lastCartSyncRef.current = null;
        lastProductNavRef.current = null;
        lastCartNavRef.current = null;
        lastCheckoutNavRef.current = null;
        lastBrowserPushRef.current = null;
        processedToolLogIdsRef.current = new Set();
      }
      return;
    }

    if (!sync) return;

    if (
      sync.cartUpdatedAt !== null &&
      sync.cartUpdatedAt !== lastCartSyncRef.current &&
      sync.cartLines.length > 0
    ) {
      lastCartSyncRef.current = sync.cartUpdatedAt;
      syncingFromVoiceRef.current = true;
      void replaceCartFromVoice(sync.cartLines, { silent: true }).finally(() => {
        syncingFromVoiceRef.current = false;
      });
    }

    if (sync.lastProductId && sync.lastProductId !== lastProductNavRef.current) {
      lastProductNavRef.current = sync.lastProductId;
      const targetPath = productPath(sync.lastProductId);
      if (pathname !== targetPath) {
        router.push(targetPath);
      }
    }

    if (
      sync.lastCartActionAt !== null &&
      sync.lastCartActionAt !== lastCartNavRef.current
    ) {
      lastCartNavRef.current = sync.lastCartActionAt;
      if (pathname !== "/cart") {
        router.push("/cart");
      }
    }

    if (
      sync.lastCheckoutNavAt !== null &&
      sync.lastCheckoutNavAt !== lastCheckoutNavRef.current
    ) {
      lastCheckoutNavRef.current = sync.lastCheckoutNavAt;
      if (pathname !== "/checkout") {
        router.push("/checkout");
      }

      const backupActions: UiAction[] = [];
      if (sync.lastCheckoutPhase) {
        backupActions.push({
          type: "setCheckoutProgress",
          phase: sync.lastCheckoutPhase as CheckoutProgressPhase,
        });
      }
      if (sync.lastSelectedDeliveryMethod) {
        backupActions.push({
          type: "prefillCheckoutDelivery",
          method: sync.lastSelectedDeliveryMethod,
        });
      }
      if (sync.lastCheckoutPhase === "delivery") {
        backupActions.push({
          type: "scrollToTarget",
          target: "checkoutDelivery",
        });
      }
      if (backupActions.length) {
        onCheckoutBackupRef.current?.(backupActions);
      }
    }
  }, [
    effectiveCallId,
    pathname,
    replaceCartFromVoice,
    router,
    sessionActive,
    sync,
  ]);

  useEffect(() => {
    if (
      !sessionActive ||
      !effectiveCallId ||
      syncingFromVoiceRef.current ||
      browserLines.length === 0 ||
      !sync
    ) {
      return;
    }

    const voiceFingerprint = cartFingerprint(sync.cartLines);

    if (
      browserFingerprint === voiceFingerprint ||
      browserFingerprint === lastBrowserPushRef.current
    ) {
      return;
    }

    lastBrowserPushRef.current = browserFingerprint;
    void pushBrowserCartToVoice({
      vapiCallId: effectiveCallId,
      lines: browserLines,
    });
  }, [
    browserFingerprint,
    browserLines,
    effectiveCallId,
    pushBrowserCartToVoice,
    sessionActive,
    sync,
  ]);
}
