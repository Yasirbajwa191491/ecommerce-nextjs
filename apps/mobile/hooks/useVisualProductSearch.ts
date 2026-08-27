import type { Id } from "@convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { Platform } from "react-native";

import { api } from "@/lib/convex-api";
import { getIsOnline } from "@/lib/network";
import { cacheProducts } from "@/lib/offline/product-store";
import { searchResultToProduct, type SearchResultProduct } from "@/lib/product-adapters";
import { getVisitorId } from "@/lib/visitor-id";

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

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

async function prepareUploadImage(image: VisualSearchImage): Promise<{
  uri: string;
  contentType: string;
}> {
  const rawType = (image.mimeType ?? "image/jpeg").toLowerCase();
  const needsJpeg =
    Platform.OS === "ios" ||
    rawType === "image/heic" ||
    rawType === "image/heif" ||
    rawType.includes("heic") ||
    rawType.includes("heif") ||
    image.uri.toLowerCase().includes(".heic") ||
    image.uri.toLowerCase().includes(".heif");

  if (!needsJpeg) {
    return { uri: image.uri, contentType: rawType.startsWith("image/") ? rawType : "image/jpeg" };
  }

  const converted = await manipulateAsync(image.uri, [], {
    compress: 0.85,
    format: SaveFormat.JPEG,
  });
  return { uri: converted.uri, contentType: "image/jpeg" };
}

export function useVisualProductSearch() {
  const [state, setState] = useState<VisualSearchState>(initialState);
  const searchByImage = useAction(api.visualProductSearch.searchByImage);
  const generateUploadUrl = useMutation(
    api.visualProductSearchMutations.generateVisualSearchUploadUrl
  );
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
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
      if (!getIsOnline()) {
        setState((current) => ({
          ...current,
          isLoading: false,
          hasSearched: false,
          errorMessage: "Visual search requires an internet connection.",
        }));
        return null;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setState((current) => ({
        ...current,
        isLoading: true,
        errorMessage: undefined,
        hasSearched: true,
        products: args.append ? current.products : [],
      }));

      try {
        const prepared = await prepareUploadImage(args.image);
        if (requestId !== requestIdRef.current) return null;

        const fileResponse = await fetch(prepared.uri);
        if (!fileResponse.ok) {
          throw new Error("Invalid image");
        }

        const blob = await fileResponse.blob();
        const rawType = (prepared.contentType || blob.type || "image/jpeg").toLowerCase();

        if (!rawType.startsWith("image/") || !SUPPORTED_IMAGE_TYPES.has(rawType)) {
          throw new Error("Unsupported image format");
        }

        const visitorId = await getVisitorId();
        if (requestId !== requestIdRef.current) return null;

        const uploadUrl = await generateUploadUrl({ visitorId });
        if (requestId !== requestIdRef.current) return null;

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": prepared.contentType },
          body: blob,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = (await uploadResponse.json()) as {
          storageId: Id<"_storage">;
        };

        if (requestId !== requestIdRef.current) return null;

        const result = await searchByImage({
          storageId,
          textQuery: args.textQuery?.trim() || undefined,
          sessionId: args.sessionId,
          cursor: args.cursor,
          limit: 12,
        });

        if (requestId !== requestIdRef.current) return null;

        void cacheProducts(result.products.map(searchResultToProduct));

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
        if (requestId !== requestIdRef.current) return null;
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
