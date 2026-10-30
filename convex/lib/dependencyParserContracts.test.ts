import { expect, it } from "vitest";
import queryString from "query-string";
import postcss from "postcss";
it("preserves Expo query parsing, Unicode, repeated keys and malformed-input tolerance", () => {
 expect(queryString.parse("q=%E2%9C%93&tag=a&tag=b")).toEqual({ q: "✓", tag: ["a", "b"] });
 expect(queryString.stringify({ route: "/order/fixture", id: "a b" })).toContain("id=a%20b");
 // Preserve existing SDK 54 behavior; the decoder security upgrade is blocked by CJS/ESM compatibility.
 const malformed = "%invalid%C0%AF";
 expect(() => queryString.parse(`query=${malformed}`)).not.toThrow();
}, 1000);
it("preserves stylesheet parsing and transformations with external map loading disabled", async () => {
 const input = "a { color: red; } /*# sourceMappingURL=/untrusted-fixture.map */";
 const result = await postcss([{ postcssPlugin: "synthetic-transform", Declaration(decl) { if (decl.prop === "color") decl.value = "blue"; } }]).process(input, { from: undefined, map: { prev: false } });
 expect(result.css).toContain("color: blue"); expect(result.map).toBeUndefined();
});
