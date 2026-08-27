import {

  createContext,

  useCallback,

  useContext,

  useMemo,

  useRef,

  useState,

  type ReactNode,

} from "react";



export type ToastType = "success" | "error" | "info" | "warning";



export type ToastPayload = {

  message: string;

  type: ToastType;

};



type ToastContextValue = {

  toast: ToastPayload | null;

  showToast: (message: string, options?: { type?: ToastType; durationMs?: number }) => void;

  showError: (message: string, durationMs?: number) => void;

  showSuccess: (message: string, durationMs?: number) => void;

};



const ToastContext = createContext<ToastContextValue | null>(null);



export function ToastProvider({ children }: { children: ReactNode }) {

  const [toast, setToast] = useState<ToastPayload | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  const clearTimer = useCallback(() => {

    if (timeoutRef.current) {

      clearTimeout(timeoutRef.current);

      timeoutRef.current = null;

    }

  }, []);



  const showToast = useCallback(

    (message: string, options?: { type?: ToastType; durationMs?: number }) => {

      clearTimer();

      const type = options?.type ?? "success";

      const durationMs = options?.durationMs ?? (type === "error" ? 3500 : 2500);

      setToast({ message, type });

      timeoutRef.current = setTimeout(() => setToast(null), durationMs);

    },

    [clearTimer]

  );



  const showError = useCallback(

    (message: string, durationMs?: number) => {

      showToast(message, { type: "error", durationMs });

    },

    [showToast]

  );



  const showSuccess = useCallback(

    (message: string, durationMs?: number) => {

      showToast(message, { type: "success", durationMs });

    },

    [showToast]

  );



  const value = useMemo(

    () => ({ toast, showToast, showError, showSuccess }),

    [toast, showToast, showError, showSuccess]

  );



  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;

}



export function useToast() {

  const context = useContext(ToastContext);

  if (!context) {

    throw new Error("useToast must be used within ToastProvider");

  }

  return context;

}


