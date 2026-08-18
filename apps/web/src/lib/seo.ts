import type { Metadata } from "next";
import { resolveSiteUrl } from "@/lib/resolve-site-url";
import { STORE_NAME } from "@/lib/site";

function getMetadataBase() {
  return new URL(resolveSiteUrl());
}

type CreatePageMetadataOptions = {
  title: string;
  description: string;
  path: string;
};

export function createPageMetadata({
  title,
  description,
  path,
}: CreatePageMetadataOptions): Metadata {
  const metadataBase = getMetadataBase();
  const url = new URL(path, metadataBase).toString();
  const fullTitle = title.includes(STORE_NAME) ? title : `${title} | ${STORE_NAME}`;

  return {
    metadataBase,
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url,
      type: "website",
      siteName: STORE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
