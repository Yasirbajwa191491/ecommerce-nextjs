import { resolveSiteUrl } from "@/lib/resolve-site-url";
import { STORE_NAME } from "@/lib/site";

export function HomeJsonLd() {
  const siteUrl = resolveSiteUrl();

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: STORE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/next.svg`,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: STORE_NAME,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const store = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: STORE_NAME,
    url: siteUrl,
    description:
      "Premium ecommerce store offering curated furniture, electronics, and lifestyle products with secure checkout and fast delivery.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(store) }}
      />
    </>
  );
}
