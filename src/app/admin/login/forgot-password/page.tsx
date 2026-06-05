"use client";

import { Suspense } from "react";
import { AdminForgotPasswordForm } from "@/components/admin/admin-forgot-password-form";
import { Spinner } from "@/components/ui/spinner";

function ForgotPasswordFallback() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background">
      <Spinner className="size-8 text-[#6254f3]" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

export default function AdminForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <AdminForgotPasswordForm />
    </Suspense>
  );
}
