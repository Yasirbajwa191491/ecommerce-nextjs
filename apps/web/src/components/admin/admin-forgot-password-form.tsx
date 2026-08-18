"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { formatOtpExpiryDuration } from "@/lib/otp-config";
import { AdminAuthLayout } from "@/components/admin/admin-auth-layout";
import { AdminOtpCountdown } from "@/components/admin/admin-otp-countdown";
import { AdminOtpInput } from "@/components/admin/admin-otp-input";
import { PasswordField } from "@/components/admin/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { validateEmail, validateStrongPassword } from "@/lib/validation/validators";
import { cn } from "@/lib/utils";

type Step = "request" | "verify" | "password";

const STEPS: Step[] = ["request", "verify", "password"];

export function AdminForgotPasswordForm() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const startVerifyStep = () => {
    setOtpSentAt(Date.now());
    setStep("verify");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      toastError(emailError, { title: "Invalid email" });
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.emailOtp.requestPasswordReset({
        email: email.trim(),
      });
      if (result.error) {
        toastError(result.error.message, {
          title: "Couldn't send code",
          fallback:
            "We couldn't send a reset code. Check the email and try again.",
        });
        return;
      }
      startVerifyStep();
      toastSuccess("Check your email", {
        description: `If an account exists for ${email.trim()}, a reset code was sent.`,
      });
    } catch {
      toastError(null, {
        title: "Couldn't send code",
        fallback: "Something went wrong. Please try again shortly.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const result = await authClient.emailOtp.requestPasswordReset({
        email: email.trim(),
      });
      if (result.error) {
        toastError(result.error.message, {
          title: "Couldn't resend code",
          fallback: "Could not resend the reset code. Try again shortly.",
        });
        return;
      }
      setOtpSentAt(Date.now());
      setOtp("");
      toastSuccess("Code resent", {
        description: `A new code was sent to ${email.trim()}.`,
      });
    } catch {
      toastError(null, {
        title: "Couldn't resend code",
        fallback: "Could not resend the reset code. Try again shortly.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toastError("Enter the 6-digit code from your email.", {
        title: "Verification code",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.emailOtp.checkVerificationOtp({
        email: email.trim(),
        type: "forget-password",
        otp,
      });
      if (result.error) {
        toastError(result.error.message, {
          title: "Invalid code",
          fallback:
            "That code is incorrect or expired. Try again or resend a new code.",
        });
        return;
      }
      setStep("password");
      setPassword("");
      setConfirmPassword("");
      toastSuccess("Code verified", {
        description: "Choose a new password to finish resetting your account.",
      });
    } catch {
      toastError(null, {
        title: "Verification failed",
        fallback: "Could not verify the code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      toastError(passwordError, { title: "Invalid password" });
      return;
    }

    if (password !== confirmPassword) {
      toastError("Passwords do not match.", { title: "Confirm password" });
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.emailOtp.resetPassword({
        email: email.trim(),
        otp,
        password,
      });
      if (result.error) {
        toastError(result.error.message, {
          title: "Reset failed",
          fallback:
            "Could not update your password. The code may have expired — start again.",
        });
        return;
      }
      toastSuccess("Password updated", {
        description: "You can now sign in with your new password.",
      });
      window.location.assign("/admin/login");
    } catch {
      toastError(null, {
        title: "Reset failed",
        fallback: "Could not reset your password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const title =
    step === "request"
      ? "Reset your password"
      : step === "verify"
        ? "Verify your email"
        : "Create a new password";

  const subtitle =
    step === "request" ? (
      "Enter your admin email and we'll send a one-time code to reset your password."
    ) : step === "verify" ? (
      <>
        We sent a 6-digit code to{" "}
        <span className="font-medium text-foreground">{email}</span>. It is
        valid for {formatOtpExpiryDuration()}.
      </>
    ) : (
      "Your code is verified. Enter and confirm your new password below."
    );

  return (
    <AdminAuthLayout
      backHref="/admin/login"
      backLabel="Back to sign in"
      mobileSubtitle="Reset password"
      stepIndicator={
        <div className="mb-5 flex gap-2 sm:mb-6 lg:mb-8">
          {STEPS.map((s, index) => (
            <span
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                stepIndex >= index ? "bg-[#6254f3]" : "bg-muted",
                stepIndex > index && "bg-[#6254f3]/50"
              )}
            />
          ))}
        </div>
      }
      title={title}
      subtitle={subtitle}
    >
      {step === "request" ? (
        <form onSubmit={handleRequestReset} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-sm font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-email"
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
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-[#6254f3] text-base font-medium hover:bg-[#5548e0] sm:h-12 sm:text-sm"
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Sending code…
              </>
            ) : (
              "Send reset code"
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href="/admin/login"
              className="font-medium text-[#6254f3] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      ) : step === "verify" ? (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="flex justify-center rounded-xl bg-muted/50 py-6">
            <KeyRound className="size-8 text-[#6254f3]" strokeWidth={1.5} />
          </div>

          {otpSentAt !== null ? <AdminOtpCountdown sentAtMs={otpSentAt} /> : null}

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
              "Verify code"
            )}
          </Button>

          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={handleResendCode}
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
                setStep("request");
                setOtp("");
                setOtpSentAt(null);
              }}
            >
              Use different email
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="flex justify-center rounded-xl bg-muted/50 py-6">
            <ShieldCheck className="size-8 text-[#6254f3]" strokeWidth={1.5} />
          </div>

          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
          />

          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            showHints={false}
          />

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-[#6254f3] text-base font-medium hover:bg-[#5548e0] sm:h-12 sm:text-sm"
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Updating password…
              </>
            ) : (
              "Reset password"
            )}
          </Button>

          <div className="border-t pt-4 text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-[#6254f3]"
              disabled={loading}
              onClick={() => {
                setStep("verify");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              Back to verification
            </Button>
          </div>
        </form>
      )}
    </AdminAuthLayout>
  );
}
