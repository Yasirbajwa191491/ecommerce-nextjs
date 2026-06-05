"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  formatOtpExpiryDuration,
  formatOtpExpiryTime,
  formatOtpRemaining,
  getOtpExpiresAt,
} from "@/lib/otp-config";
import { cn } from "@/lib/utils";

type AdminOtpCountdownProps = {
  sentAtMs: number;
  className?: string;
};

export function AdminOtpCountdown({ sentAtMs, className }: AdminOtpCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const expiresAt = getOtpExpiresAt(sentAtMs);
  const remainingMs = Math.max(0, expiresAt - now);
  const expired = remainingMs === 0;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        expired
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-[#6254f3]/20 bg-[#6254f3]/5 text-foreground",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Clock
        className={cn(
          "mt-0.5 size-4 shrink-0",
          expired ? "text-destructive" : "text-[#6254f3]"
        )}
        aria-hidden
      />
      <div className="min-w-0 space-y-0.5">
        {expired ? (
          <p className="font-medium">This code has expired</p>
        ) : (
          <>
            <p>
              Expires on{" "}
              <span className="font-medium tabular-nums">
                {formatOtpExpiryTime(sentAtMs)}
              </span>
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium tabular-nums text-foreground">
                {formatOtpRemaining(remainingMs)}
              </span>{" "}
              remaining
            </p>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Codes are valid for {formatOtpExpiryDuration()}
        </p>
      </div>
    </div>
  );
}
