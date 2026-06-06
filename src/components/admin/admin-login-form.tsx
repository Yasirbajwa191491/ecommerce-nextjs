"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  ShieldCheck,
  Store,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { formatOtpExpiryDuration } from "@/lib/otp-config";
import { AdminOtpCountdown } from "@/components/admin/admin-otp-countdown";
import { AdminOtpInput } from "@/components/admin/admin-otp-input";
import { STORE_NAME } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/lib/app-toast";

type Step = "credentials" | "otp";

const REMEMBER_ME_KEY = "admin_login_remember_me";
const REMEMBERED_EMAIL_KEY = "admin_login_email";

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin/home";
  const initialRememberMe =
    typeof window !== "undefined" &&
    window.localStorage.getItem(REMEMBER_ME_KEY) === "true";
  const initialRememberedEmail =
    typeof window !== "undefined" && initialRememberMe
      ? window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ""
      : "";

  const navigateAfterLogin = () => {
    // Force a full navigation so middleware sees the freshly set auth cookie.
    window.location.assign(redirect);
  };

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState(initialRememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(initialRememberMe);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const startOtpStep = () => {
    setOtpSentAt(Date.now());
    setStep("otp");
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        const code = result.error.code ?? "";
        const message = result.error.message ?? "Sign in failed";
        if (
          code === "EMAIL_NOT_VERIFIED" ||
          message.toLowerCase().includes("verify")
        ) {
          await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
          });
          startOtpStep();
          toast.info("Check your email for a verification code.");
          return;
        }
        toastError(message, {
          title: "Sign in failed",
          fallback: "Invalid email or password.",
        });
        return;
      }
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_ME_KEY, "true");
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_ME_KEY);
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      navigateAfterLogin();
    } catch {
      try {
        await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "email-verification",
        });
        startOtpStep();
        toast.info("Check your email for a verification code.");
      } catch {
        toastError(null, {
          title: "Sign in failed",
          fallback: "Invalid email or password.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toastError("Enter the 6-digit code", {
        title: "Verification code",
        fallback: "Enter the 6-digit code from your email.",
      });
      return;
    }
    setLoading(true);
    try {
      const verify = await authClient.emailOtp.verifyEmail({ email, otp });
      if (verify.error) {
        toastError(verify.error.message ?? "Invalid code", {
          title: "Invalid code",
          fallback: "That code is incorrect or expired. Try again or resend.",
        });
        return;
      }
      const signIn = await authClient.signIn.email({ email, password });
      if (signIn.error) {
        toastError(signIn.error.message, {
          title: "Sign in failed",
          fallback: "Sign in failed after verification. Please try again.",
        });
        return;
      }
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_ME_KEY, "true");
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_ME_KEY);
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      toastSuccess("Email verified. Welcome!");
      navigateAfterLogin();
    } catch {
      toastError(null, {
        title: "Verification failed",
        fallback: "Could not verify your email. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      setOtpSentAt(Date.now());
      toastSuccess("Code resent", {
        description: `A new code was sent to ${email}.`,
      });
    } catch {
      toastError(null, {
        title: "Couldn't resend code",
        fallback: "Could not resend the verification code. Try again shortly.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid items-start lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-stretch">
      {/* Brand panel — desktop & tablet landscape */}
      <aside
        className={cn(
          "relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between",
          "bg-[#6254f3] text-white"
        )}
        aria-hidden={false}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255,255,255,0.35) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 90%, rgba(0,0,0,0.2) 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 flex flex-col gap-10 p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <LayoutDashboard className="size-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Administration</p>
              <p className="text-lg font-semibold tracking-tight">{STORE_NAME}</p>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Manage your store with confidence
            </h1>
            <p className="text-base leading-relaxed text-white/85">
              Secure access to products, categories, and team accounts — all in
              one place.
            </p>
          </div>

          <ul className="space-y-4 text-sm text-white/90">
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-white/90" />
              <span>Email verification and encrypted sessions</span>
            </li>
            <li className="flex items-start gap-3">
              <Store className="mt-0.5 size-5 shrink-0 text-white/90" />
              <span>Real-time catalog synced with your storefront</span>
            </li>
          </ul>
        </div>

        <p className="relative z-10 px-10 pb-10 text-xs text-white/60 xl:px-14">
          Authorized personnel only
        </p>
      </aside>

      {/* Form column */}
      <main className="flex w-full flex-col bg-background max-lg:h-auto lg:min-h-dvh">
        {/* Mobile / tablet brand strip */}
        <div className="shrink-0 border-b bg-[#6254f3] px-4 py-4 text-white sm:px-6 lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
              <LayoutDashboard className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{STORE_NAME}</p>
              <p className="text-xs text-white/80">Admin sign in</p>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col justify-start px-4 pt-4 pb-8 sm:px-8 sm:pt-5 md:px-10 md:pt-6 lg:flex-1 lg:justify-center lg:px-16 lg:py-10 xl:px-20">
          <div className="mx-auto w-full max-w-[420px]">
            <Link
              href="/home"
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:mb-6 lg:mb-8"
            >
              <ArrowLeft className="size-4" />
              Back to store
            </Link>

            {/* Step indicator */}
            <div className="mb-5 flex gap-2 sm:mb-6 lg:mb-8">
              <span
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  step === "credentials" ? "bg-[#6254f3]" : "bg-[#6254f3]/30"
                )}
              />
              <span
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  step === "otp" ? "bg-[#6254f3]" : "bg-muted"
                )}
              />
            </div>

            <div className="mb-5 space-y-2 sm:mb-6 lg:mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {step === "credentials" ? "Welcome back" : "Verify your email"}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {step === "credentials" ? (
                  "Sign in with your admin credentials to continue."
                ) : (
                  <>
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                    It is valid for {formatOtpExpiryDuration()}.
                  </>
                )}
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm ring-1 ring-black/5 sm:p-6 md:p-8">
              {step === "credentials" ? (
                <form onSubmit={handleCredentials} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="h-11 pl-10 text-base sm:h-12 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Password
                      </Label>
                      <Link
                        href="/admin/login/forgot-password"
                        className="text-xs font-medium text-[#6254f3] hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 pr-11 pl-10 text-base sm:h-12 sm:text-sm"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute top-1/2 right-2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" aria-hidden />
                        ) : (
                          <Eye className="size-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full bg-[#6254f3] text-base font-medium hover:bg-[#5548e0] sm:h-12 sm:text-sm"
                  >
                    {loading ? (
                      <>
                        <Spinner className="mr-2" />
                        Signing in…
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                  <div className="flex items-center justify-between pt-1">
                    <label
                      htmlFor="remember-me"
                      className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                      />
                      Remember me
                    </label>
                    <span className="text-xs text-muted-foreground/80">
                      Saves email on this device
                    </span>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center rounded-xl bg-muted/50 py-6">
                    <KeyRound className="size-8 text-[#6254f3]" strokeWidth={1.5} />
                  </div>
                  {otpSentAt !== null ? (
                    <AdminOtpCountdown sentAtMs={otpSentAt} />
                  ) : null}
                  <AdminOtpInput value={otp} onChange={setOtp} />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full bg-[#6254f3] text-base font-medium hover:bg-[#5548e0] sm:h-12 sm:text-sm"
                  >
                    {loading ? (
                      <>
                        <Spinner className="mr-2" />
                        Verifying…
                      </>
                    ) : (
                      "Verify & continue"
                    )}
                  </Button>
                  <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={loading}
                      onClick={handleResendOtp}
                      className="text-muted-foreground"
                    >
                      Resend code
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-[#6254f3]"
                      onClick={() => {
                        setStep("credentials");
                        setOtp("");
                        setOtpSentAt(null);
                      }}
                    >
                      Use different account
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground sm:mt-6 lg:mt-8">
              Protected area · Session secured
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
