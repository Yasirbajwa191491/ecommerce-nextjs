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
    setCountry(detectRuntimePhoneCountry());
  }, []);

  return country;
}
