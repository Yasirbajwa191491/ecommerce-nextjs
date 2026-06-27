import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Spinner } from "@/components/ui/spinner";

function LoginFallback() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background">
      <Spinner className="size-8 text-[#6254f3]" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
