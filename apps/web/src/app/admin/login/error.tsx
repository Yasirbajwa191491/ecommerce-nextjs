"use client";

import { createErrorPage } from "@/components/errors/create-error-page";

export default createErrorPage({
  variant: "admin",
  segment: "admin-login",
  title: "Sign-in unavailable",
});
