"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";

export function CartRestoreBanner() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("restored") === "1") {
      setVisible(true);
    }
  }, [searchParams]);

  if (!visible) return null;

  return (
    <Alert className="mb-6 border-brand-primary/30 bg-brand-primary/5">
      <Sparkles className="size-4 text-brand-primary" />
      <AlertTitle>Welcome back!</AlertTitle>
      <AlertDescription>
        Your cart has been restored. Review your items and complete checkout when
        you are ready.
      </AlertDescription>
    </Alert>
  );
}
