"use client";

import { createErrorPage } from "@/components/errors/create-error-page";

export default createErrorPage({
  variant: "admin-dashboard",
  segment: "admin-dashboard",
  title: "Something went wrong",
});
