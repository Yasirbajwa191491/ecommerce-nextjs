"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  ShieldCheck,
  Store,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { STORE_NAME } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Step = "credentials" | "otp";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin/products";

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

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
          setStep("otp");
          toast.info("Check your email for a verification code.");
          return;
        }
        toast.error(message);
        return;
      }
      router.push(redirect);
    } catch {
      try {
        await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "email-verification",
        });
        setStep("otp");
        toast.info("Check your email for a verification code.");
      } catch {
        toast.error("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const verify = await authClient.emailOtp.verifyEmail({ email, otp });
      if (verify.error) {
        toast.error(verify.error.message ?? "Invalid code");
        return;
      }
      const signIn = await authClient.signIn.email({ email, password });
      if (signIn.error) {
        toast.error(signIn.error.message ?? "Sign in failed after verification");
        return;
      }
      toast.success("Email verified. Welcome!");
      router.push(redirect);
    } catch {
      toast.error("Verification failed");
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
      toast.success("Code resent");
    } catch {
      toast.error("Could not resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
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
      <main className="flex min-h-dvh flex-col bg-background">
        {/* Mobile / tablet brand strip */}
        <div className="border-b bg-[#6254f3] px-4 py-5 text-white sm:px-6 lg:hidden">
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

        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 sm:py-10 md:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-[420px]">
            <Link
              href="/home"
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:mb-8"
            >
              <ArrowLeft className="size-4" />
              Back to store
            </Link>

            {/* Step indicator */}
            <div className="mb-6 flex gap-2 sm:mb-8">
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

            <div className="mb-6 space-y-2 sm:mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {step === "credentials" ? "Welcome back" : "Verify your email"}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {step === "credentials" ? (
                  "Sign in with your admin credentials to continue."
                ) : (
                  <>
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-foreground">{email}</span>
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
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 pl-10 text-base sm:h-12 sm:text-sm"
                      />
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
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center rounded-xl bg-muted/50 py-6">
                    <KeyRound className="size-8 text-[#6254f3]" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-3">
                    <Label className="block text-center text-sm font-medium">
                      Enter verification code
                    </Label>
                    <div className="flex justify-center overflow-x-auto pb-1">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                        containerClassName="gap-1.5 sm:gap-2"
                      >
                        <InputOTPGroup className="gap-1.5 sm:gap-2">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              className="size-10 rounded-lg border-2 text-lg sm:size-12 sm:text-xl"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
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
                      }}
                    >
                      Use different account
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground sm:mt-8">
              Protected area · Session secured with Better Auth
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
