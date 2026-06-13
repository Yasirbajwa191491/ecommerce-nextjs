"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getVapiAssistantId,
  getVapiPublicKey,
  type VapiAssistantState,
  type VapiTranscriptEntry,
} from "@/lib/vapi-config";

type VapiClient = import("@vapi-ai/web").default;

function createEntry(
  role: VapiTranscriptEntry["role"],
  text: string
): VapiTranscriptEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    text,
    timestamp: Date.now(),
  };
}

function formatVapiError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof err === "string" && err.trim()) return err;
  return "Voice assistant error. Check microphone permission and try again.";
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

export function useVapiAssistant() {
  const publicKey = getVapiPublicKey();
  const assistantId = getVapiAssistantId();
  const vapiRef = useRef<VapiClient | null>(null);
  const vapiPromiseRef = useRef<Promise<VapiClient> | null>(null);
  const isConnectedRef = useRef(false);
  const hasActiveCallRef = useRef(false);
  const mountedRef = useRef(true);

  const [state, setState] = useState<VapiAssistantState>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<VapiTranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const setConnected = useCallback((connected: boolean) => {
    isConnectedRef.current = connected;
    setIsConnected(connected);
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

          if (
            message.type === "transcript" &&
            typeof message.transcript === "string"
          ) {
            if (message.transcriptType === "partial") return;
            const role =
              message.role === "user"
                ? "user"
                : message.role === "assistant"
                  ? "assistant"
                  : "system";
            setTranscript((prev) => [
              ...prev,
              createEntry(role, message.transcript as string),
            ]);
          }

          if (
            message.type === "tool-calls" ||
            message.type === "function-call" ||
            message.type === "status-update"
          ) {
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
  }, [publicKey, setConnected]);

  const ensureActiveCall = useCallback(async () => {
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

    const ready = waitForCallStart(vapi);
    await vapi.start(assistantId);
    await ready;
    return vapi;
  }, [assistantId, getVapiClient]);

  const startVoiceCall = useCallback(async () => {
    setError(null);
    setState("processing");

    try {
      await ensureActiveCall();
    } catch (err) {
      hasActiveCallRef.current = false;
      setError(formatVapiError(err));
      setConnected(false);
      setState("idle");
    }
  }, [ensureActiveCall, setConnected]);

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
        const vapi = await ensureActiveCall();
        vapi.send({
          type: "add-message",
          message: { role: "user", content: trimmed },
          triggerResponseEnabled: true,
        });
      } catch (err) {
        hasActiveCallRef.current = false;
        setError(formatVapiError(err));
        setConnected(false);
        setState("idle");
      }
    },
    [assistantId, ensureActiveCall, setConnected]
  );

  const clearTranscript = useCallback(() => {
    setTranscript([]);
  }, []);

  return {
    configured: Boolean(publicKey && assistantId),
    state,
    isConnected,
    transcript,
    error,
    startVoiceCall,
    stopCall,
    clearTranscript,
    sendMessage,
  };
}
