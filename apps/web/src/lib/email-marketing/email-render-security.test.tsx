import { expect, it } from "vitest";
import { render, Html, Body, Text } from "@react-email/components";
it("patched renderer escapes plain email content and produces text without leaking object prototypes", async () => {
 const email = <Html><Body><Text>{'<script>fixture</script> & text'}</Text></Body></Html>;
 const html = await render(email); expect(html).toContain("&lt;script&gt;fixture&lt;/script&gt;"); expect(html).not.toContain("<script>fixture");
 const text = await render(email, { plainText: true }); expect(text).toContain("fixture"); expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});
