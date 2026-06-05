"use client";

import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type AdminOtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function AdminOtpInput({
  value,
  onChange,
  label = "Enter verification code",
}: AdminOtpInputProps) {
  return (
    <div className="space-y-3">
      <Label className="block text-center text-sm font-medium">{label}</Label>
      <div className="flex justify-center overflow-x-auto pb-1">
        <InputOTP
          maxLength={6}
          value={value}
          onChange={onChange}
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
  );
}
