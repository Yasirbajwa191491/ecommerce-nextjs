"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      className={cn("w-full", className)}
      style={{ marginLeft: "1.5rem" }}
    >
      <div className="flex h-10 items-stretch overflow-hidden rounded-full border border-border bg-background shadow-sm sm:h-11">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
          className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
          style={{ paddingLeft: "1.25rem", paddingRight: "0.75rem" }}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-none border-l border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground sm:size-11"
          aria-label="Search"
        >
          <Search className="size-[1.125rem]" />
        </Button>
      </div>
    </form>
  );
}
