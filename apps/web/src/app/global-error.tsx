"use client";

import { useEffect } from "react";
import { ErrorPageView } from "@/components/errors/error-page-view";
import { logAppError } from "@/lib/errors";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logAppError(error, { segment: "global", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorPageView
          variant="global"
          title="Application error"
          error={error}
          reset={reset}
        />
      </body>
    </html>
  );
}
