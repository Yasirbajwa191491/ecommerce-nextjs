import type { Id } from "@convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "@/lib/convex-api";
import type { SearchResultProduct } from "@/lib/product-adapters";

export type VisualSearchImage = {
  uri: string;
  mimeType?: string;
};

export type VisualSearchState = {
  products: SearchResultProduct[];
  totalCount: number;
  nextCursor?: number;
  isLoading: boolean;
  errorMessage?: string;
  provider?: string;
  fallbackUsed?: string;
  hasSearched: boolean;
};

const initialState: VisualSearchState = {
  products: [],
  totalCount: 0,
  isLoading: false,
  hasSearched: false,
};

export function useVisualProductSearch() {
  const [state, setState] = useState<VisualSearchState>(initialState);
  const searchByImage = useAction(api.visualProductSearch.searchByImage);
  const generateUploadUrl = useMutation(
    api.visualProductSearchMutations.generateVisualSearchUploadUrl
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const search = useCallback(
    async (args: {
      image: VisualSearchImage;
      textQuery?: string;
      sessionId?: string;
      cursor?: number;
      append?: boolean;
    }) => {
      setState((current) => ({
        ...current,
        isLoading: true,
        errorMessage: undefined,
        hasSearched: true,
        products: args.append ? current.products : [],
      }));

      try {
        const fileResponse = await fetch(args.image.uri);
        if (!fileResponse.ok) {
          throw new Error("Invalid image");
        }

        const blob = await fileResponse.blob();
        const contentType =
          args.image.mimeType ?? blob.type ?? "image/jpeg";

        if (!contentType.startsWith("image/")) {
          throw new Error("Invalid image");
        }

        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = (await uploadResponse.json()) as {
          storageId: Id<"_storage">;
        };

        const result = await searchByImage({
          storageId,
          textQuery: args.textQuery?.trim() || undefined,
          sessionId: args.sessionId,
          cursor: args.cursor,
          limit: 12,
        });

        setState((current) => ({
          ...current,
          isLoading: false,
          products: args.append
            ? [...current.products, ...result.products]
            : result.products,
          totalCount: result.totalCount,
          nextCursor: result.nextCursor,
          provider: result.provider,
          fallbackUsed: result.fallbackUsed,
          errorMessage: result.message,
        }));

        return result;
      } catch {
        setState((current) => ({
          ...current,
          isLoading: false,
          errorMessage:
            "We couldn't search by image right now. Try another photo or browse products.",
        }));
        return null;
      }
    },
    [generateUploadUrl, searchByImage]
  );

  return { ...state, search, reset };
}
