"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toastError, toastSuccess } from "@/lib/app-toast";

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useQuery(api.auth.getSessionInfo);
  const hasSuperAdmin = useQuery(api.auth.hasSuperAdmin);
  const bootstrap = useMutation(api.auth.bootstrapSuperAdmin);
  const [bootstrapping, setBootstrapping] = useState(false);
  const autoBootstrapAttempted = useRef(false);
  const redirectAttempted = useRef(false);

  const runBootstrap = async () => {
    setBootstrapping(true);
    try {
      const result = await bootstrap({});
      if (result.bootstrapped) {
        toastSuccess("You are now the super admin", {
          description: "Reloading your dashboard…",
        });
        router.refresh();
      }
    } catch (err) {
      toastError(err, {
        title: "Setup failed",
        fallback: "Could not grant admin access. Please try again.",
      });
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    if (
      autoBootstrapAttempted.current ||
      session === undefined ||
      hasSuperAdmin === undefined
    ) {
      return;
    }
    if (
      session?.authenticated &&
      !session.isAdmin &&
      hasSuperAdmin === false
    ) {
      autoBootstrapAttempted.current = true;
      void runBootstrap();
    }
  }, [session, hasSuperAdmin]);

  useEffect(() => {
    if (session === undefined) return;
    if (session.authenticated) {
      redirectAttempted.current = false;
      return;
    }
    if (redirectAttempted.current) return;
    redirectAttempted.current = true;
    const redirectPath = pathname?.startsWith("/admin") ? pathname : "/admin/home";
    router.replace(`/admin/login?redirect=${encodeURIComponent(redirectPath)}`);
  }, [pathname, router, session]);

  if (session === undefined || hasSuperAdmin === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-[#6254f3]" />
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-[#6254f3]" />
      </div>
    );
  }

  if (session.isAdmin) {
    return <>{children}</>;
  }

  const canBootstrap = hasSuperAdmin === false;

  return (
    <div className="flex min-h-[50vh] items-center justify-center py-12">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-amber-500/10">
          <ShieldAlert className="size-7 text-amber-600" aria-hidden />
        </div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Admin access
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {canBootstrap ? "Set up your admin account" : "Admin role required"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {canBootstrap ? (
            <>
              No super admin exists yet. You can claim super admin access for{" "}
              <span className="font-medium text-foreground">{session.email}</span>{" "}
              to manage this store.
            </>
          ) : (
            <>
              You are signed in as{" "}
              <span className="font-medium text-foreground">{session.email}</span>{" "}
              with role{" "}
              <span className="font-medium text-foreground">{session.role}</span>.
              Signing in to the admin panel does not grant admin permissions — a
              super admin must assign you the <strong>admin</strong> or{" "}
              <strong>superAdmin</strong> role.
            </>
          )}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {canBootstrap ? (
            <Button
              type="button"
              disabled={bootstrapping}
              onClick={() => void runBootstrap()}
              className="h-11 gap-2 bg-[#6254f3] hover:bg-[#5548e0]"
            >
              {bootstrapping ? (
                <>
                  <Spinner className="size-4" />
                  Setting up…
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" aria-hidden />
                  Become super admin
                </>
              )}
            </Button>
          ) : (
            <Link
              href="/admin/login"
              className={buttonVariants({ variant: "outline", className: "h-11" })}
            >
              Sign in with another account
            </Link>
          )}
          <Link
            href="/home"
            className={buttonVariants({ variant: "outline", className: "h-11" })}
          >
            Back to store
          </Link>
        </div>

        {!canBootstrap && (
          <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
            Seeded super admin (if you ran <code className="rounded bg-muted px-1">npm run seed</code>
            ): <span className="font-mono">yasir.sohail@savari.io</span>
          </p>
        )}
      </div>
    </div>
  );
}
