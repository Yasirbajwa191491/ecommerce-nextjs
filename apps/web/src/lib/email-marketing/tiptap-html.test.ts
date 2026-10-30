import { expect, it } from "vitest";
import { tiptapJsonToHtml } from "./tiptap-html";
it("renders server-side headings, formatted paragraphs, lists, links and images without a DOM", () => {
 const json = { type: "doc", content: [
  { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Fixture" }] },
  { type: "paragraph", content: [{ type: "text", text: "A & <B>", marks: [{ type: "bold" }] }, { type: "text", text: "Link", marks: [{ type: "link", attrs: { href: "https://example.invalid" } }] }] },
  { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item" }] }] }] },
  { type: "image", attrs: { src: "https://example.invalid/image.png", alt: "Fixture" } },
 ] };
 const html = tiptapJsonToHtml(JSON.stringify(json));
 expect(html).toContain("<h2>Fixture</h2>"); expect(html).toContain("<strong>A &amp; &lt;B&gt;</strong>"); expect(html).toContain('href="https://example.invalid"'); expect(html).toContain("<ul>"); expect(html).toContain('src="https://example.invalid/image.png"');
});
it("returns an empty string for empty, invalid or unsupported document JSON", () => { expect(tiptapJsonToHtml("")).toBe(""); expect(tiptapJsonToHtml("invalid")).toBe(""); expect(tiptapJsonToHtml('{"type":"unrecognized-fixture"}')).toBe(""); });
