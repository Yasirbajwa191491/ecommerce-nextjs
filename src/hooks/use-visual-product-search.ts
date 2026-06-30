"use client";

import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { HybridSearchProduct } from "@/hooks/use-hybrid-product-search";

export type VisualSearchProduct = HybridSearchProduct;

export type VisualSearchState = {
  products: VisualSearchProduct[];
  totalCount: number;
  nextCursor?: number;
  isLoading: boolean;
  errorMessage?: string;
  provider?: string;
  fallbackUsed?: string;
  previewUrl?: string;
};

const initialState: VisualSearchState = {
  products: [],
  totalCount: 0,
  isLoading: false,
};

export function useVisualProductSearch() {
  const [state, setState] = useState<VisualSearchState>(initialState);
  const searchByImage = useAction(api.visualProductSearch.searchByImage);
  const generateUploadUrl = useMutation(
    api.visualProductSearchMutations.generateVisualSearchUploadUrl
  );

  const reset = useCallback(() => {
    setState((s) => {
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      return initialState;
    });
  }, []);

  const search = useCallback(
    async (args: {
      file: File;
      textQuery?: string;
      sessionId?: string;
      categorySlug?: string;
      brandSlugs?: string[];
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      cursor?: number;
      append?: boolean;
    }) => {
      const previewUrl = URL.createObjectURL(args.file);
      setState((s) => ({
        ...s,
        isLoading: true,
        errorMessage: undefined,
        previewUrl,
        products: args.append ? s.products : [],
      }));

      try {
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": args.file.type },
          body: args.file,
        });
        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }
        const { storageId } = (await uploadResponse.json()) as {
          storageId: Id<"_storage">;
        };

        const result = await searchByImage({
          storageId,
          textQuery: args.textQuery,
          sessionId: args.sessionId,
          categorySlug: args.categorySlug,
          brandSlugs: args.brandSlugs,
          minPrice: args.minPrice,
          maxPrice: args.maxPrice,
          minRating: args.minRating,
          cursor: args.cursor,
          limit: 12,
        });

        setState((s) => ({
          ...s,
          isLoading: false,
          products: args.append
            ? [...s.products, ...result.products]
            : result.products,
          totalCount: result.totalCount,
          nextCursor: result.nextCursor,
          provider: result.provider,
          fallbackUsed: result.fallbackUsed,
          errorMessage: result.message,
          previewUrl,
        }));

        return result;
      } catch {
        setState((s) => ({
          ...s,
          isLoading: false,
          errorMessage:
            "We couldn't search by image right now. Try keyword or semantic search.",
          previewUrl,
        }));
        return null;
      }
    },
    [generateUploadUrl, searchByImage]
  );

  return { ...state, search, reset };
}
