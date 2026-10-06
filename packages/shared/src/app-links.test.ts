import { describe, expect, it } from "vitest";

import {
  APP_LINK_PATHS,
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  parseSha256Fingerprints,
} from "./app-links";

describe("app link association files", () => {
  it("does not invent an Apple team id or signing fingerprint", () => {
    expect(buildAppleAppSiteAssociation(undefined)).toBeNull();
    expect(buildAppleAppSiteAssociation("TEAMID")).toBeNull();
    expect(buildAssetLinks(parseSha256Fingerprints("REPLACE_WITH_FINGERPRINT"))).toBeNull();
  });

  it("includes the documented storefront paths when identities are configured", () => {
    const apple = buildAppleAppSiteAssociation("AB12CD34EF");
    expect(apple?.applinks.details[0]?.appID).toBe("AB12CD34EF.com.yasir.ecommerce");
    expect(apple?.applinks.details[0]?.paths).toEqual([...APP_LINK_PATHS]);
    expect(APP_LINK_PATHS).toContain("/category/*");
    expect(APP_LINK_PATHS).toContain("/checkout/*");
    expect(APP_LINK_PATHS).toContain("/promotions/*");
    for (const root of ["/checkout", "/promotions", "/track-order"]) {
      expect(APP_LINK_PATHS).toContain(root);
      expect(APP_LINK_PATHS).toContain(`${root}/*`);
    }

    const fingerprint = "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";
    const assetLinks = buildAssetLinks(parseSha256Fingerprints(fingerprint.toLowerCase()));
    expect(assetLinks?.[0]?.target.sha256_cert_fingerprints).toEqual([fingerprint]);
  });
});
