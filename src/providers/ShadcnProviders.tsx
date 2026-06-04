"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function ShadcnProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      enableColorScheme={false}
      disableTransitionOnChange
    >
      <TooltipProvider>
        {children}
        <Toaster
          richColors
          closeButton
          position="top-right"
          expand={false}
          gap={10}
          toastOptions={{
            classNames: {
              toast:
                "group-[.toaster]:shadow-md group-[.toaster]:border group-[.toaster]:rounded-xl",
              title: "group-[.toast]:font-semibold group-[.toast]:text-sm",
              description: "group-[.toast]:text-sm group-[.toast]:opacity-90",
              error:
                "group-[.toaster]:border-destructive/25 group-[.toaster]:bg-destructive/5",
              success:
                "group-[.toaster]:border-emerald-500/25 group-[.toaster]:bg-emerald-500/5",
            },
          }}
        />
      </TooltipProvider>
    </ThemeProvider>
  );
}
