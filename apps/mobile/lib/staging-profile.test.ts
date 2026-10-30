import { expect, it } from "vitest";
import config from "../eas.json";
it("keeps preview builds in the preview environment without embedding production service URLs", () => {
 const preview = config.build.preview as {environment?:string;env?:Record<string,string>};
 expect(preview.environment).toBe("preview");
 const productionUrls = Object.values(config.build.production.env).filter(value => /^https?:/.test(value));
 for (const value of Object.values(preview.env ?? {})) expect(productionUrls).not.toContain(value);
 expect(preview.env?.EXPO_PUBLIC_CONVEX_URL).toBeUndefined();
});
