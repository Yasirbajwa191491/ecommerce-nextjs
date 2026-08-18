"use client";

import { createErrorPage } from "@/components/errors/create-error-page";

export default createErrorPage({
  variant: "shop",
  segment: "shop",
  title: "We couldn't load this page",
});
