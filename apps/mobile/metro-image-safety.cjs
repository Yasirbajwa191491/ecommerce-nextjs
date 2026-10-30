// Supported image-size API: deny the vulnerable parsers before dispatch.
// Metro's supported image asset types do not include these container formats.
const DISABLED_IMAGE_METADATA_TYPES = ["icns", "heif", "jxl", "jxl-stream"];
function configureImageMetadataSafety(imageSize) {
  imageSize.disableTypes([...DISABLED_IMAGE_METADATA_TYPES]);
}
function configureMetroImageMetadataSafety() {
  const { createRequire } = require("node:module");
  // Configure each owning Metro copy without loading Metro or starting its server.
  for (const owner of ["metro/package.json", "@expo/metro/package.json"]) {
    const fromOwner = createRequire(require.resolve(owner));
    configureImageMetadataSafety(fromOwner("image-size"));
  }
}
module.exports = { configureImageMetadataSafety, configureMetroImageMetadataSafety, DISABLED_IMAGE_METADATA_TYPES };

const IMAGE_ASSET_EXTENSIONS = /\.(?:png|jpe?g|bmp|gif|webp|psd|svg|tiff?|ktx)$/i;
function assertSafeImageMetadataHeader(header) {
  const start = Buffer.from(header);
  if (start.subarray(0, 4).toString("ascii") === "icns" ||
      ["ftyp", "JXL "].includes(start.subarray(4, 8).toString("ascii")) ||
      (start[0] === 0xff && start[1] === 0x0a)) {
    throw new Error("Unsupported image metadata format");
  }
}
function validateMetroAssetResolution(resolution) {
  if (resolution?.type !== "assetFiles") return;
  const fs = require("node:fs");
  for (const filename of resolution.filePaths) {
    if (!IMAGE_ASSET_EXTENSIONS.test(filename)) continue;
    const stat = fs.statSync(filename);
    if (!stat.isFile() || stat.size === 0 || stat.size > 64 * 1024 * 1024) throw new Error("Invalid image asset size");
    const fd = fs.openSync(filename, "r");
    try {
      const header = Buffer.alloc(8);
      fs.readSync(fd, header, 0, 8, 0);
      assertSafeImageMetadataHeader(header);
    } finally { fs.closeSync(fd); }
  }
}
module.exports.assertSafeImageMetadataHeader = assertSafeImageMetadataHeader;
module.exports.validateMetroAssetResolution = validateMetroAssetResolution;
