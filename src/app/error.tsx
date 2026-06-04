"use client";

import { createErrorPage } from "@/components/errors/create-error-page";

export default createErrorPage({
  variant: "shop",
  segment: "app",
  title: "Something went wrong",
});
