"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function HeaderSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = query.trim();
    if (term) {
      router.push(`/products?search=${encodeURIComponent(term)}`);
      return;
    }
    router.push("/products");
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn("relative w-full max-w-xl", className)}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products, brands, categories..."
        aria-label="Search products"
        className="h-10 rounded-full border-border/80 bg-muted/40 pr-4 pl-10 text-sm shadow-none transition-[box-shadow,background-color] duration-200 placeholder:text-muted-foreground/80 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/30 md:h-11"
      />
    </form>
  );
}
