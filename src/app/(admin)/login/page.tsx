"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

type Step = "credentials" | "otp";

function AdminLoginForm() {
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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Admin sign in</CardTitle>
          <CardDescription>
            {step === "credentials"
              ? "Enter your email and password"
              : "Enter the verification code sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex flex-col items-center gap-2">
                <Label>Verification code</Label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying…" : "Verify & continue"}
              </Button>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={handleResendOtp}
                >
                  Resend code
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setStep("credentials")}
                >
                  Back to sign in
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
