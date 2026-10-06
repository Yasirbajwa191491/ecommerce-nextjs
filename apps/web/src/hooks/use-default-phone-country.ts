"use client";

import { useEffect, useState } from "react";
import {
  detectRuntimePhoneCountry,
  FALLBACK_PHONE_COUNTRY,
  type PhoneCountryCode,
} from "@ecommerce/shared";

export function useDefaultPhoneCountry(): PhoneCountryCode {
  const [country, setCountry] = useState<PhoneCountryCode>(FALLBACK_PHONE_COUNTRY);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCountry(detectRuntimePhoneCountry());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return country;
}
