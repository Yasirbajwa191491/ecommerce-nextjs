import { useMemo } from "react";
import {
  detectRuntimePhoneCountry,
  type PhoneCountryCode,
} from "@ecommerce/shared";

export function useDefaultPhoneCountry(): PhoneCountryCode {
  return useMemo(() => detectRuntimePhoneCountry(), []);
}
