import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
const MAX_BYTES = 5 * 1024 * 1024;
export function publicAddress(address: string): boolean {
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(?:0[0-1][0-9a-f]{2}|0|db8):/i.test(address) && !/^2002:/i.test(address);
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && [0, 168].includes(b) || a === 100 && b >= 64 && b <= 127 || a === 198 && [18, 19, 51].includes(b) || a === 203 && b === 0);
}
export function validateImageUrl(raw: string, origins: string[]): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443" || isIP(url.hostname.replace(/^\[|\]$/g, "")) || !origins.includes(url.origin)) throw new Error("Image source is not approved");
  return url;
}
export function validateImageBytes(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > MAX_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("Unsupported image");
}
/** Resolve once, validate all answers, and pin the TLS connection to that address. No redirects. */
export async function downloadImage(raw: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const origins = (process.env.IMAGE_EMBED_ALLOWED_ORIGINS ?? "").split(",").map(x => x.trim()).filter(Boolean);
  const url = validateImageUrl(raw, origins);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(x => !publicAddress(x.address))) throw new Error("Image destination is not public");
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    const req = request(url, { method: "GET", lookup: (_host, _options, callback) => callback(null, pinned.address, pinned.family) }, res => {
      if (res.statusCode !== 200) { res.destroy(); reject(new Error("Image fetch rejected")); return; }
      const mime = String(res.headers["content-type"] ?? "").split(";")[0];
      const chunks: Buffer[] = []; let size = 0;
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) { res.destroy(); reject(new Error("Unsupported image")); return; }
      res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > MAX_BYTES) { res.destroy(); reject(new Error("Image is too large")); } else chunks.push(chunk); });
      res.on("error", reject);
      res.on("end", () => { const bytes = Buffer.concat(chunks); try { validateImageBytes(bytes, mime); resolve({ bytes, mime }); } catch (error) { reject(error); } });
    });
    const timer = setTimeout(() => req.destroy(new Error("Image timeout")), 10_000);
    req.on("close", () => clearTimeout(timer)); req.on("error", reject); req.end();
  });
}
