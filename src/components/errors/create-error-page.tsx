"use client";

import { useEffect } from "react";
import type { ErrorPageVariant } from "@/components/errors/error-page-view";
import { ErrorPageView } from "@/components/errors/error-page-view";
import { logAppError } from "@/lib/errors";

type CreateErrorPageOptions = {
  variant: ErrorPageVariant;
  segment: string;
  title?: string;
};

export function createErrorPage({
  variant,
  segment,
  title,
}: CreateErrorPageOptions) {
  return function SegmentError({
    error,
    reset,
  }: {
    error: Error & { digest?: string };
    reset: () => void;
  }) {
    useEffect(() => {
      logAppError(error, { segment, digest: error.digest });
    }, [error]);

    return (
      <ErrorPageView
        variant={variant}
        title={title}
        error={error}
        reset={reset}
      />
    );
  };
}
