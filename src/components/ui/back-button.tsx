import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  href: string;
  label: string;
  className?: string;
};

export function BackButton({ href, label, className }: BackButtonProps) {
  return (
    <Button
      render={<Link href={href} />}
      variant="outline"
      className={cn(
        "h-10 gap-2 rounded-full border-border/80 bg-white px-5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/40",
        className
      )}
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      {label}
    </Button>
  );
}
