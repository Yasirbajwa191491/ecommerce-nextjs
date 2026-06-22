"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildActivityStepStart,
  buildUnderstandingStep,
  extractToolCallsFromMessage,
  extractToolResultsFromMessage,
  finalizeActivityStep,
  type VapiActivityStep,
  type VapiToolEvent,
} from "@/lib/vapi-activity";
import {
  extractLatestAssistantText,
  extractCheckoutUrl,
  extractCheckoutUrlFromToolResult,
  formatToolResultForDisplay,
  formatVapiError,
  getVapiAssistantId,
  getVapiPublicKey,
  isCheckoutRelatedMessage,
  isOrderConfirmationSpeech,
  looksLikeSpelledOutIdentifier,
  normalizeAssistantDisplayText,
  isStructuredToolMessage,
  type VapiAssistantState,
  type VapiTranscriptEntry,
} from "@/lib/vapi-config";
import { inferAssistantStateFromTool } from "@/lib/vapi-ui-actions/activity-phases";

export type UseVapiAssistantOptions = {
  onToolStart?: (event: VapiToolEvent) => void;
  onToolComplete?: (event: VapiToolEvent) => void;
  onUserMessage?: (text: string) => void;
  onStateOverride?: (state: VapiAssistantState | null) => void;
};

type VapiClient = import("@vapi-ai/web").default;

function createEntry(
  role: VapiTranscriptEntry["role"],
  text: string,
  extras?: Pick<VapiTranscriptEntry, "linkUrl" | "assistantTurn">
): VapiTranscriptEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    text,
    timestamp: Date.now(),
    ...extras,
  };
}

function upsertAssistantTurnEntry(
  prev: VapiTranscriptEntry[],
  text: string,
  assistantTurn?: number,
  linkUrl?: string,
  authoritativeOrderNumber?: string
): VapiTranscriptEntry[] {
  const normalized = normalizeAssistantDisplayText(text, authoritativeOrderNumber);
  if (!normalized) return prev;

  if (assistantTurn !== undefined) {
    const turnIndex = prev.findIndex(
      (entry) => entry.role === "assistant" && entry.assistantTurn === assistantTurn
    );
    if (turnIndex >= 0) {
      const next = [...prev];
      next[turnIndex] = {
        ...next[turnIndex]!,
        text: normalized,
        linkUrl: linkUrl ?? next[turnIndex]!.linkUrl,
      };
      return next;
    }
  }

  const last = prev[prev.length - 1];
  if (
    last?.role === "assistant" &&
    (assistantTurn === undefined || last.assistantTurn === assistantTurn)
  ) {
    if (isStructuredToolMessage(last.text)) {
      if (isOrderConfirmationSpeech(normalized)) {
        return prev;
      }
      return [
        ...prev,
        createEntry("assistant", normalized, { assistantTurn, linkUrl }),
      ];
    }

    return [
      ...prev.slice(0, -1),
      {
        ...last,
        text: normalized,
        linkUrl: linkUrl ?? last.linkUrl,
        assistantTurn: assistantTurn ?? last.assistantTurn,
      },
    ];
  }

  return [
    ...prev,
    createEntry("assistant", normalized, { assistantTurn, linkUrl }),
  ];
}

function extractOrderNumberFromToolResult(result: unknown): string | undefined {
  if (typeof result !== "object" || result === null) {
    if (typeof result === "string") {
      try {
        const parsed: unknown = JSON.parse(result);
        return extractOrderNumberFromToolResult(parsed);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  const payload = result as Record<string, unknown>;
  return typeof payload.orderNumber === "string" ? payload.orderNumber : undefined;
}

function appendToolResultEntry(
  prev: VapiTranscriptEntry[],
  toolName: string,
  result: unknown
): VapiTranscriptEntry[] {
  const formatted = formatToolResultForDisplay(toolName, result);
  if (!formatted) return prev;

  const last = prev[prev.length - 1];
  if (
    last?.role === "assistant" &&
    last.text === formatted.text &&
    last.linkUrl === formatted.linkUrl
  ) {
    return prev;
  }

  return [
    ...prev,
    createEntry("assistant", formatted.text, { linkUrl: formatted.linkUrl }),
  ];
}

function applyCheckoutUrlToTranscript(
  prev: VapiTranscriptEntry[],
  checkoutUrl: string,
  result: unknown
): VapiTranscriptEntry[] {
  const hasCheckoutCard = prev.some(
    (entry) =>
      entry.linkUrl === checkoutUrl || entry.text.startsWith("Checkout ready!")
  );

  let next = prev.map((entry) => {
    if (entry.linkUrl || entry.role !== "assistant") return entry;
    if (isCheckoutRelatedMessage(entry.text)) {
      return { ...entry, linkUrl: checkoutUrl };
    }
    return entry;
  });

  if (!hasCheckoutCard) {
    next = appendToolResultEntry(next, "createCheckoutSession", result);
    if (!next.some((entry) => entry.linkUrl === checkoutUrl)) {
      next = [
        ...next,
        createEntry(
          "assistant",
          "Checkout ready!\nUse the button below to pay securely on Stripe.",
          { linkUrl: checkoutUrl }
        ),
      ];
    }
  }

  return next;
}

async function ensureMicrophoneAccess(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not supported in this browser.");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === "NotAllowedError") {
        throw new Error(
          "Microphone access denied. In Chrome, open site settings for localhost → Microphone → Allow, then try Voice call again."
        );
      }
      if (err.name === "NotFoundError") {
        throw new Error("No microphone found. Connect a microphone and try Voice call again.");
      }
      if (err.name === "NotReadableError") {
        throw new Error(
          "Microphone is in use by another app. Close other apps using the mic and try Voice call again."
        );
      }
    }
    throw new Error(
      "Microphone access denied. Allow microphone permission for localhost in your browser settings, then try Voice call again."
    );
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function waitForCallStart(vapi: VapiClient, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Assistant connection timed out. Please try again."));
    }, timeoutMs);

    const onStart = () => {
      cleanup();
      resolve();
    };

    const onError = (err: unknown) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      vapi.removeListener("call-start", onStart);
      vapi.removeListener("error", onError);
    };

    vapi.on("call-start", onStart);
    vapi.on("error", onError);
  });
}

export function useVapiAssistant(options?: UseVapiAssistantOptions) {
  const publicKey = getVapiPublicKey();
  const assistantId = getVapiAssistantId();
  const vapiRef = useRef<VapiClient | null>(null);
  const vapiPromiseRef = useRef<Promise<VapiClient> | null>(null);
  const isConnectedRef = useRef(false);
  const hasActiveCallRef = useRef(false);
  const textChatIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const pendingToolsRef = useRef<Map<string, VapiToolEvent>>(new Map());
  const vapiCallIdRef = useRef<string | null>(null);
  const confirmedOrderNumberRef = useRef<string | undefined>(undefined);
  const onToolStartRef = useRef(options?.onToolStart);
  const onToolCompleteRef = useRef(options?.onToolComplete);
  const onUserMessageRef = useRef(options?.onUserMessage);
  const onStateOverrideRef = useRef(options?.onStateOverride);
  const stateOverrideRef = useRef<VapiAssistantState | null>(null);

  onToolStartRef.current = options?.onToolStart;
  onToolCompleteRef.current = options?.onToolComplete;
  onUserMessageRef.current = options?.onUserMessage;
  onStateOverrideRef.current = options?.onStateOverride;

  const [state, setState] = useState<VapiAssistantState>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<VapiTranscriptEntry[]>([]);
  const [activitySteps, setActivitySteps] = useState<VapiActivityStep[]>([]);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(
    null
  );
  const [vapiCallId, setVapiCallId] = useState<string | null>(null);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<string | undefined>(
    undefined
  );
  const [error, setError] = useState<string | null>(null);

  const applyAssistantState = useCallback((next: VapiAssistantState) => {
    if (stateOverrideRef.current) return;
    setState(next);
  }, []);

  const handleToolStart = useCallback((events: VapiToolEvent[]) => {
    if (!events.length) return;

    const firstTool = events[0]?.toolName;
    const inferred = firstTool ? inferAssistantStateFromTool(firstTool) : null;
    if (inferred) applyAssistantState(inferred);

    setActivitySteps((prev) => {
      const completedUnderstanding = prev.map((step) =>
        step.toolName === "user_request" && step.status === "active"
          ? { ...step, status: "complete" as const }
          : step
      );
      let next = completedUnderstanding;
      for (const event of events) {
        pendingToolsRef.current.set(event.toolCallId, event);
        next = [...next, buildActivityStepStart(event)];
      }
      return next;
    });

    for (const event of events) {
      onToolStartRef.current?.(event);
    }
  }, [applyAssistantState]);

  const setConnected = useCallback((connected: boolean) => {
    isConnectedRef.current = connected;
    setIsConnected(connected);
  }, []);

  const handleToolComplete = useCallback((events: VapiToolEvent[]) => {
    if (!events.length) return;

    const mergedEvents = events.map((event) => {
      const pending = pendingToolsRef.current.get(event.toolCallId);
      return {
        ...event,
        toolName:
          event.toolName !== "unknown"
            ? event.toolName
            : (pending?.toolName ?? event.toolName),
        parameters: pending?.parameters ?? event.parameters,
      };
    });

    setActivitySteps((prev) => {
      let next = prev;
      for (const merged of mergedEvents) {
        const index = next.findIndex(
          (step) => step.toolCallId === merged.toolCallId
        );
        if (index >= 0) {
          const updated = [...next];
          updated[index] = finalizeActivityStep(updated[index]!, merged);
          next = updated;
        } else {
          const fallbackIndex = next.findLastIndex(
            (step) =>
              step.toolName === merged.toolName && step.status === "active"
          );
          if (fallbackIndex >= 0) {
            const updated = [...next];
            updated[fallbackIndex] = finalizeActivityStep(
              updated[fallbackIndex]!,
              merged
            );
            next = updated;
          } else {
            next = [
              ...next,
              finalizeActivityStep(buildActivityStepStart(merged), merged),
            ];
          }
        }
      }
      return next;
    });

    setTranscript((prev) => {
      let next = prev;
      for (const merged of mergedEvents) {
        const checkoutUrl = extractCheckoutUrlFromToolResult(merged.result);
        if (checkoutUrl) {
          next = applyCheckoutUrlToTranscript(next, checkoutUrl, merged.result);
        } else {
          next = appendToolResultEntry(next, merged.toolName, merged.result);
        }
      }

      const orderNumber = mergedEvents
        .map((event) => extractOrderNumberFromToolResult(event.result))
        .find(Boolean);

      if (orderNumber) {
        next = next.map((entry) => {
          if (entry.role !== "assistant") return entry;
          if (isStructuredToolMessage(entry.text)) return entry;
          if (!isOrderConfirmationSpeech(entry.text)) return entry;
          return {
            ...entry,
            text: normalizeAssistantDisplayText(entry.text, orderNumber),
          };
        });
      }

      return next;
    });

    for (const merged of mergedEvents) {
      const checkoutUrl = extractCheckoutUrlFromToolResult(merged.result);
      if (checkoutUrl) {
        setStripeCheckoutUrl(checkoutUrl);
      }

      const orderNumber = extractOrderNumberFromToolResult(merged.result);
      if (
        orderNumber &&
        (merged.toolName === "createCashOrder" ||
          merged.toolName === "createCheckoutSession")
      ) {
        confirmedOrderNumberRef.current = orderNumber;
        setConfirmedOrderNumber(orderNumber);
      }

      pendingToolsRef.current.delete(merged.toolCallId);
      onToolCompleteRef.current?.(merged);

      const completeInferred = inferAssistantStateFromTool(merged.toolName);
      if (completeInferred === "checkout_ready") {
        applyAssistantState("checkout_ready");
      }
    }

    const placedCheckout = mergedEvents.some(
      (event) =>
        event.toolName === "createCashOrder" ||
        event.toolName === "createCheckoutSession"
    );
    if (!placedCheckout) {
      applyAssistantState("thinking");
    }
  }, [applyAssistantState]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const vapi = vapiRef.current;
      if (vapi && hasActiveCallRef.current) {
        hasActiveCallRef.current = false;
        void vapi.stop().catch(() => {
          // Ignore teardown errors during unmount.
        });
      }
      vapiRef.current = null;
      vapiPromiseRef.current = null;
      textChatIdRef.current = null;
    };
  }, []);

  const getVapiClient = useCallback(async (): Promise<VapiClient | null> => {
    if (!publicKey) return null;
    if (vapiRef.current) return vapiRef.current;

    if (!vapiPromiseRef.current) {
      vapiPromiseRef.current = import("@vapi-ai/web").then(({ default: Vapi }) => {
        const vapi = new Vapi(publicKey);

        vapi.on("call-start", (payload?: unknown) => {
          if (!mountedRef.current) return;
          hasActiveCallRef.current = true;
          setConnected(true);
          setState("listening");
          setError(null);
          setStripeCheckoutUrl(null);

          const callRecord =
            typeof payload === "object" && payload !== null
              ? (payload as Record<string, unknown>)
              : null;
          const nextCallId =
            callRecord?.id ??
            callRecord?.callId ??
            (typeof callRecord?.call === "object" &&
            callRecord.call !== null &&
            "id" in callRecord.call
              ? String((callRecord.call as { id?: unknown }).id ?? "")
              : undefined);
          if (typeof nextCallId === "string" && nextCallId.trim()) {
            vapiCallIdRef.current = nextCallId.trim();
            setVapiCallId(nextCallId.trim());
          }
        });

        vapi.on("call-end", () => {
          if (!mountedRef.current) return;
          hasActiveCallRef.current = false;
          setConnected(false);
          setState("idle");
          setVapiCallId(null);
          vapiCallIdRef.current = null;
        });

        vapi.on("speech-start", () => {
          if (!mountedRef.current) return;
          setState("speaking");
        });

        vapi.on("speech-end", () => {
          if (!mountedRef.current) return;
          setState(isConnectedRef.current ? "listening" : "idle");
        });

        vapi.on("message", (message: Record<string, unknown>) => {
          if (!mountedRef.current) return;

          const callRecord =
            typeof message.call === "object" && message.call !== null
              ? (message.call as Record<string, unknown>)
              : null;
          const nextCallId =
            callRecord?.id ?? message.callId ?? message.vapiCallId;
          if (typeof nextCallId === "string" && nextCallId.trim()) {
            vapiCallIdRef.current = nextCallId.trim();
            setVapiCallId(nextCallId.trim());
          }

          const messageType = String(message.type ?? "");

          if (
            messageType === "transcript" &&
            typeof message.transcript === "string"
          ) {
            if (message.transcriptType === "partial") return;
            const role =
              message.role === "user"
                ? "user"
                : message.role === "assistant"
                  ? "assistant"
                  : "system";

            if (role === "assistant" && isConnectedRef.current) {
              return;
            }

            const transcriptText = message.transcript.trim();
            if (
              role === "assistant" &&
              looksLikeSpelledOutIdentifier(transcriptText)
            ) {
              return;
            }

            if (role === "user") {
              onUserMessageRef.current?.(transcriptText);
            }

            setTranscript((prev) => [
              ...prev,
              createEntry(
                role,
                role === "assistant"
                  ? normalizeAssistantDisplayText(
                      transcriptText,
                      confirmedOrderNumberRef.current
                    )
                  : transcriptText
              ),
            ]);
          }

          if (
            messageType === "assistant.speechStarted" &&
            typeof message.text === "string"
          ) {
            const assistantTurn =
              typeof message.turn === "number" ? message.turn : undefined;
            setTranscript((prev) =>
              upsertAssistantTurnEntry(
                prev,
                message.text as string,
                assistantTurn,
                undefined,
                confirmedOrderNumberRef.current
              )
            );
          }

          if (messageType === "conversation-update") {
            const assistantText = extractLatestAssistantText(
              message.messagesOpenAIFormatted ?? message.messages
            );
            if (assistantText) {
              setTranscript((prev) =>
                upsertAssistantTurnEntry(
                  prev,
                  assistantText,
                  undefined,
                  undefined,
                  confirmedOrderNumberRef.current
                )
              );
            }
          }

          if (messageType === "tool-calls-result") {
            const resultEvents = extractToolResultsFromMessage(message);
            if (resultEvents.length) {
              handleToolComplete(resultEvents);
            }
          }

          if (
            messageType === "tool-calls" ||
            messageType === "function-call"
          ) {
            const startEvents = extractToolCallsFromMessage(message);
            if (startEvents.length) {
              handleToolStart(startEvents);
            }

            const inlineResults = extractToolResultsFromMessage(message);
            if (inlineResults.length) {
              handleToolComplete(inlineResults);
            }

            setState("processing");
          }

          if (messageType === "status-update") {
            setState("processing");
          }
        });

        vapi.on("error", (err: unknown) => {
          if (!mountedRef.current) return;
          hasActiveCallRef.current = false;
          setError(formatVapiError(err));
          setConnected(false);
          setState("idle");
        });

        vapiRef.current = vapi;
        return vapi;
      });
    }

    return vapiPromiseRef.current;
  }, [publicKey, setConnected, handleToolComplete, handleToolStart]);

  const ensureVoiceCall = useCallback(async () => {
    if (!assistantId) {
      throw new Error("Assistant is not configured.");
    }

    const vapi = await getVapiClient();
    if (!vapi) {
      throw new Error("Voice assistant is not configured.");
    }

    if (hasActiveCallRef.current) {
      return vapi;
    }

    await ensureMicrophoneAccess();

    const ready = waitForCallStart(vapi);
    await vapi.start(assistantId);
    await ready;
    return vapi;
  }, [assistantId, getVapiClient]);

  const sendTextChat = useCallback(async (text: string) => {
    const response = await fetch("/api/vapi/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        previousChatId: textChatIdRef.current ?? undefined,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      chatId?: string;
      reply?: string;
      error?: string;
      billingRequired?: boolean;
    };

    if (!response.ok) {
      const billingError = new Error(data.error ?? "Unable to send your message.");
      (billingError as Error & { billingRequired?: boolean }).billingRequired =
        data.billingRequired === true;
      throw billingError;
    }

    if (data.chatId) {
      textChatIdRef.current = data.chatId;
      vapiCallIdRef.current = data.chatId;
      setVapiCallId(data.chatId);
    }

    if (data.reply) {
      const normalized = normalizeAssistantDisplayText(
        data.reply,
        confirmedOrderNumberRef.current
      );
      const linkUrl = extractCheckoutUrl(normalized);
      setTranscript((prev) => [
        ...prev,
        createEntry("assistant", normalized, { linkUrl }),
      ]);
    }

    setState("idle");
  }, []);

  const sendViaVoiceSession = useCallback(
    async (text: string) => {
      const vapi = await ensureVoiceCall();
      vapi.send({
        type: "add-message",
        message: { role: "user", content: text },
        triggerResponseEnabled: true,
      });
    },
    [ensureVoiceCall]
  );

  const startVoiceCall = useCallback(async () => {
    setError(null);
    setState("processing");

    try {
      await ensureVoiceCall();
    } catch (err) {
      hasActiveCallRef.current = false;
      setError(formatVapiError(err));
      setConnected(false);
      setState("idle");
    }
  }, [ensureVoiceCall, setConnected]);

  const stopCall = useCallback(async () => {
    const vapi = vapiRef.current;
    if (!vapi || !hasActiveCallRef.current) {
      setConnected(false);
      setState("idle");
      return;
    }

    try {
      await vapi.stop();
    } catch (err) {
      setError(formatVapiError(err));
    } finally {
      hasActiveCallRef.current = false;
      setConnected(false);
      setState("idle");
    }
  }, [setConnected]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !assistantId) return;

      setTranscript((prev) => [...prev, createEntry("user", trimmed)]);
      onUserMessageRef.current?.(trimmed);
      setActivitySteps((prev) => {
        const understanding = buildUnderstandingStep();
        const withoutStale = prev.filter(
          (step) => step.toolName !== "user_request" || step.status !== "active"
        );
        return [...withoutStale, understanding];
      });
      applyAssistantState("thinking");
      setError(null);

      try {
        if (hasActiveCallRef.current) {
          const vapi = await getVapiClient();
          if (!vapi) {
            throw new Error("Voice assistant is not configured.");
          }
          vapi.send({
            type: "add-message",
            message: { role: "user", content: trimmed },
            triggerResponseEnabled: true,
          });
          return;
        }

        await sendTextChat(trimmed);
        setState("processing");
      } catch (err) {
        const billingRequired =
          typeof err === "object" &&
          err !== null &&
          "billingRequired" in err &&
          (err as { billingRequired?: boolean }).billingRequired === true;

        if (billingRequired) {
          try {
            await sendViaVoiceSession(trimmed);
            setError(
              "Text chat needs a Vapi billing card. Using voice session instead — allow microphone access."
            );
            return;
          } catch (voiceErr) {
            setError(formatVapiError(voiceErr));
            setState("idle");
            return;
          }
        }

        setError(formatVapiError(err));
        setState("idle");
      }
    },
    [assistantId, getVapiClient, sendTextChat, sendViaVoiceSession, applyAssistantState]
  );

  const completeServerTools = useCallback((toolNames: string[]) => {
    if (!toolNames.length) return;
    const names = new Set(toolNames);
    setActivitySteps((prev) =>
      prev.map((step) =>
        names.has(step.toolName) && step.status === "active"
          ? { ...step, status: "complete" as const }
          : step
      )
    );
  }, []);

  const setResolvedCallId = useCallback((callId: string) => {
    const trimmed = callId.trim();
    if (!trimmed) return;
    vapiCallIdRef.current = trimmed;
    setVapiCallId(trimmed);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setActivitySteps([]);
    setStripeCheckoutUrl(null);
    setVapiCallId(null);
    setConfirmedOrderNumber(undefined);
    vapiCallIdRef.current = null;
    confirmedOrderNumberRef.current = undefined;
    pendingToolsRef.current.clear();
    textChatIdRef.current = null;
  }, []);

  return {
    configured: Boolean(publicKey && assistantId),
    state,
    isConnected,
    transcript,
    activitySteps,
    stripeCheckoutUrl,
    vapiCallId,
    confirmedOrderNumber,
    error,
    startVoiceCall,
    stopCall,
    clearTranscript,
    sendMessage,
    completeServerTools,
    setResolvedCallId,
  };
}
