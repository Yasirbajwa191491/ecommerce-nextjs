import type { Metadata } from "next";
import { STORE_NAME } from "@/lib/site";

const DEFAULT_SITE_URL = "http://localhost:3000";

function getMetadataBase() {
  const siteUrl = process.env.SITE_URL?.trim() || DEFAULT_SITE_URL;
  return new URL(siteUrl);
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
