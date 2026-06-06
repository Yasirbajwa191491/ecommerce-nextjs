import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { generateHTML } from "@tiptap/html";

const extensions = [
  StarterKit,
  Link.configure({ openOnClick: false }),
  Image,
];

export function tiptapJsonToHtml(contentJson: string): string {
  if (!contentJson.trim()) return "";
  try {
    const json = JSON.parse(contentJson) as Record<string, unknown>;
    return generateHTML(json, extensions);
  } catch {
    return "";
  }
}

export const EMPTY_TIPTAP_DOC = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});
