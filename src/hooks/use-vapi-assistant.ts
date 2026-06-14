"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildActivityStepStart,
  extractToolCallsFromMessage,
  extractToolResultsFromMessage,
  finalizeActivityStep,
  type VapiActivityStep,
  type VapiToolEvent,
} from "@/lib/vapi-activity";
import {
  extractLatestAssistantText,
  extractCheckoutUrl,
  formatToolResultForDisplay,
  getVapiAssistantId,
  getVapiPublicKey,
  looksLikeSpelledOutIdentifier,
  looksLikeVoiceSpacingArtifact,
  normalizeAssistantDisplayText,
  isStructuredToolMessage,
  type VapiAssistantState,
  type VapiTranscriptEntry,
} from "@/lib/vapi-config";

export type UseVapiAssistantOptions = {
  onToolStart?: (event: VapiToolEvent) => void;
  onToolComplete?: (event: VapiToolEvent) => void;
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
  linkUrl?: string
): VapiTranscriptEntry[] {
  const normalized = normalizeAssistantDisplayText(text);
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

function stripTrailingNonStructuredAssistant(
  prev: VapiTranscriptEntry[]
): VapiTranscriptEntry[] {
  const next = [...prev];
  while (next.length > 0) {
    const last = next[next.length - 1];
    if (last?.role !== "assistant") break;
    if (isStructuredToolMessage(last.text)) break;
    next.pop();
  }
  return next;
}

function appendToolResultEntry(
  prev: VapiTranscriptEntry[],
  toolName: string,
  result: unknown
): VapiTranscriptEntry[] {
  const formatted = formatToolResultForDisplay(toolName, result);
  if (!formatted) return prev;

  const base = stripTrailingNonStructuredAssistant(prev);

  const last = base[base.length - 1];
  if (
    last?.role === "assistant" &&
    last.text === formatted.text &&
    last.linkUrl === formatted.linkUrl
  ) {
    return base;
  }

  return [
    ...base,
    createEntry("assistant", formatted.text, { linkUrl: formatted.linkUrl }),
  ];
}

function formatVapiError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null) {
    const record = err as Record<string, unknown>;
    for (const key of ["message", "error", "msg", "reason"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    if (typeof record.type === "string" && record.type.includes("microphone")) {
      return "Microphone access is required for voice calls. Allow mic permission in your browser and try again.";
    }
  }
  if (typeof err === "string" && err.trim()) return err;
  return "Voice assistant error. Check microphone permission and try again.";
}

async function ensureMicrophoneAccess(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not supported in this browser.");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
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
  const onToolStartRef = useRef(options?.onToolStart);
  const onToolCompleteRef = useRef(options?.onToolComplete);

  onToolStartRef.current = options?.onToolStart;
  onToolCompleteRef.current = options?.onToolComplete;

  const [state, setState] = useState<VapiAssistantState>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<VapiTranscriptEntry[]>([]);
  const [activitySteps, setActivitySteps] = useState<VapiActivityStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleToolStart = useCallback((events: VapiToolEvent[]) => {
    if (!events.length) return;

    setActivitySteps((prev) => {
      let next = prev;
      for (const event of events) {
        pendingToolsRef.current.set(event.toolCallId, event);
        next = [...next, buildActivityStepStart(event)];
      }
      return next;
    });

    for (const event of events) {
      onToolStartRef.current?.(event);
    }
  }, []);

  const setConnected = useCallback((connected: boolean) => {
    isConnectedRef.current = connected;
    setIsConnected(connected);
  }, []);

  const handleToolComplete = useCallback((events: VapiToolEvent[]) => {
    if (!events.length) return;

    setActivitySteps((prev) => {
      let next = prev;
      for (const event of events) {
        const pending = pendingToolsRef.current.get(event.toolCallId);
        const merged: VapiToolEvent = {
          ...event,
          toolName:
            event.toolName !== "unknown"
              ? event.toolName
              : (pending?.toolName ?? event.toolName),
          parameters: pending?.parameters ?? event.parameters,
        };

        const index = next.findIndex(
          (step) => step.toolCallId === merged.toolCallId
        );
        if (index >= 0) {
          const updated = [...next];
          updated[index] = finalizeActivityStep(updated[index]!, merged);
          next = updated;
        } else {
          next = [
            ...next,
            finalizeActivityStep(buildActivityStepStart(merged), merged),
          ];
        }

        pendingToolsRef.current.delete(event.toolCallId);
        onToolCompleteRef.current?.(merged);
      }
      return next;
    });
  }, []);

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

        vapi.on("call-start", () => {
          if (!mountedRef.current) return;
          hasActiveCallRef.current = true;
          setConnected(true);
          setState("listening");
          setError(null);
        });

        vapi.on("call-end", () => {
          if (!mountedRef.current) return;
          hasActiveCallRef.current = false;
          setConnected(false);
          setState("idle");
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
              (looksLikeSpelledOutIdentifier(transcriptText) ||
                looksLikeVoiceSpacingArtifact(transcriptText))
            ) {
              return;
            }

            setTranscript((prev) => [
              ...prev,
              createEntry(role, transcriptText),
            ]);
          }

          if (
            messageType === "assistant.speechStarted" &&
            typeof message.text === "string"
          ) {
            if (isConnectedRef.current) {
              return;
            }

            const assistantTurn =
              typeof message.turn === "number" ? message.turn : undefined;
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (
                last?.role === "assistant" &&
                isStructuredToolMessage(last.text)
              ) {
                return prev;
              }
              return upsertAssistantTurnEntry(
                prev,
                message.text as string,
                assistantTurn
              );
            });
          }

          if (messageType === "conversation-update") {
            if (isConnectedRef.current) {
              return;
            }

            const assistantText = extractLatestAssistantText(
              message.messagesOpenAIFormatted ?? message.messages
            );
            if (assistantText) {
              setTranscript((prev) =>
                upsertAssistantTurnEntry(prev, assistantText)
              );
            }
          }

          if (messageType === "tool-calls-result") {
            const resultEvents = extractToolResultsFromMessage(message);
            if (resultEvents.length) {
              handleToolComplete(resultEvents);
            }

            setTranscript((prev) => {
              let next = prev;
              for (const event of resultEvents) {
                next = appendToolResultEntry(next, event.toolName, event.result);
              }
              return next;
            });
          }

          if (
            messageType === "tool-calls" ||
            messageType === "function-call"
          ) {
            const startEvents = extractToolCallsFromMessage(message);
            if (startEvents.length) {
              handleToolStart(startEvents);
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
    }

    if (data.reply) {
      const normalized = normalizeAssistantDisplayText(data.reply);
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
      setState("processing");
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
    [assistantId, getVapiClient, sendTextChat, sendViaVoiceSession]
  );

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setActivitySteps([]);
    pendingToolsRef.current.clear();
    textChatIdRef.current = null;
  }, []);

  return {
    configured: Boolean(publicKey && assistantId),
    state,
    isConnected,
    transcript,
    activitySteps,
    error,
    startVoiceCall,
    stopCall,
    clearTranscript,
    sendMessage,
  };
}
