"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 400;

type HeaderSearchProps = {
  className?: string;
  inputPadding?: "default" | "comfortable";
};

function HeaderSearchForm({
  className,
  inputPadding = "default",
  initialQuery = "",
}: HeaderSearchProps & { initialQuery?: string }) {
  const [query, setQuery] = useState("");
  const [hasEdited, setHasEdited] = useState(false);
  const inputValue = hasEdited ? query : initialQuery;
  const debouncedQuery = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearchTerm = searchParams.get("search") ?? "";
  const lastSyncedTermRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasEdited) return;

    const term = debouncedQuery.trim();
    if (term === urlSearchTerm && lastSyncedTermRef.current === term) return;

    const params = new URLSearchParams(searchParams.toString());
    if (term) params.set("search", term);
    else params.delete("search");

    const qs = params.toString();
    const targetPath = qs ? `/products?${qs}` : "/products";
    const currentPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "";

    if (currentPath === targetPath) {
      lastSyncedTermRef.current = term;
      return;
    }

    lastSyncedTermRef.current = term;

    if (pathname === "/products") {
      router.replace(targetPath, { scroll: false });
      return;
    }

    if (term) {
      router.push(targetPath);
    }
  }, [debouncedQuery, hasEdited, pathname, router, searchParams, urlSearchTerm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasEdited(true);
    const term = inputValue.trim();
    const params = new URLSearchParams();
    if (term) params.set("search", term);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  };

  const inputStyle =
    inputPadding === "comfortable"
      ? { paddingLeft: "1.75rem", paddingRight: "1rem" }
      : { paddingLeft: "1.5rem", paddingRight: "1rem" };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn("w-full max-w-xl", className)}
    >
      <div className="flex h-10 items-stretch overflow-hidden rounded-full border border-border/80 bg-background shadow-sm transition-shadow focus-within:border-[#6254f3]/40 focus-within:shadow-md sm:h-11">
        <Input
          type="search"
          value={inputValue}
          onChange={(e) => {
            setHasEdited(true);
            setQuery(e.target.value);
          }}
          placeholder="Search products"
          aria-label="Search products"
          className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent py-0 text-sm shadow-none focus-visible:ring-0"
          style={inputStyle}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-none border-l border-border/80 text-muted-foreground hover:bg-[#6254f3]/5 hover:text-[#6254f3] sm:size-11"
          aria-label="Search"
        >
          <Search className="size-[1.125rem]" />
        </Button>
      </div>
    </form>
  );
}

function HeaderSearchWithParams(props: HeaderSearchProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("search") ?? "";
  return <HeaderSearchForm {...props} initialQuery={initialQuery} />;
}

function HeaderSearchFallback({ className }: HeaderSearchProps) {
  return (
    <Skeleton
      className={cn("h-10 w-full max-w-xl rounded-full sm:h-11", className)}
    />
  );
}

export function HeaderSearch(props: HeaderSearchProps) {
  return (
    <Suspense fallback={<HeaderSearchFallback className={props.className} />}>
      <HeaderSearchWithParams {...props} />
    </Suspense>
  );
}
