import { createRequire } from "node:module";
import { expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { configureMetroImageMetadataSafety } = require("../../apps/mobile/metro-image-safety.cjs") as { configureMetroImageMetadataSafety: () => void };
it("disables vulnerable container parsers in both Metro-owned image-size copies without executing Metro", () => {
 configureMetroImageMetadataSafety();
 const png = Buffer.alloc(24); Buffer.from("89504e470d0a1a0a0000000d49484452", "hex").copy(png); png.writeUInt32BE(2,16); png.writeUInt32BE(3,20);
 const icns = Buffer.alloc(16); icns.write("icns",0); icns.writeUInt32BE(16,4); icns.write("icp4",8); // Malformed zero-length entry, never dispatch to its vulnerable parser.
 for (const owner of ["metro/package.json", "@expo/metro/package.json"]) {
  const fromOwner = createRequire(require.resolve(owner));
  // Exact interop used by both audited Metro Assets.js call sites.
  const module = fromOwner("image-size");
  const imageSize = (module && module.__esModule ? module.default : module) as (input: Buffer) => { width: number; height: number };
  expect(imageSize(png)).toMatchObject({ width: 2, height: 3 });
  expect(() => imageSize(icns)).toThrow("disabled file type: icns");
  expect(() => imageSize(Buffer.from("invalid"))).toThrow();
 }
});
it("rejects risky signatures before image-size validators, including disguised assets", async () => {
 const { assertSafeImageMetadataHeader, validateMetroAssetResolution } = require("../../apps/mobile/metro-image-safety.cjs") as { assertSafeImageMetadataHeader: (header: Buffer) => void; validateMetroAssetResolution: (result: { type: string; filePaths?: string[] }) => void };
 for (const header of [Buffer.from("icns0000"), Buffer.from([0,0,0,0,74,88,76,32]), Buffer.from([0,0,0,0,102,116,121,112]), Buffer.from([255,10,0,0])]) expect(() => assertSafeImageMetadataHeader(header)).toThrow("Unsupported");
 const fs = await import("node:fs"); const os = await import("node:os"); const path = await import("node:path");
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), "image-metadata-fixture-"));
 try {
  const filename = path.join(dir, "disguised.png"); fs.writeFileSync(filename, Buffer.from("icns0000"));
  expect(() => validateMetroAssetResolution({ type: "assetFiles", filePaths: [filename] })).toThrow("Unsupported");
  fs.writeFileSync(filename, Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"));
  expect(() => validateMetroAssetResolution({ type: "assetFiles", filePaths: [filename] })).not.toThrow();
  fs.writeFileSync(filename, Buffer.alloc(0)); expect(() => validateMetroAssetResolution({ type: "assetFiles", filePaths: [filename] })).toThrow("size");
  expect(() => validateMetroAssetResolution({ type: "sourceFile", filePaths: [filename] })).not.toThrow();
 } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
it("preserves Metro's second asset-loader contract, which supplies a filename rather than a buffer", async () => {
 const fs = await import("node:fs"); const os = await import("node:os"); const path = await import("node:path");
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metro-filename-contract-"));
 try {
  const png = Buffer.alloc(24); Buffer.from("89504e470d0a1a0a0000000d49484452", "hex").copy(png); png.writeUInt32BE(2,16); png.writeUInt32BE(3,20);
  const filename = path.join(dir,"fixture.png"); fs.writeFileSync(filename,png);
  for (const owner of ["metro/package.json", "@expo/metro/package.json"]) {
   const module = createRequire(require.resolve(owner))("image-size");
   const imageSize = module && module.__esModule ? module.default : module;
   expect(imageSize(filename)).toMatchObject({ width: 2, height: 3 });
  }
 } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
