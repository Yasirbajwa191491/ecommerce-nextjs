const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = (context.originModulePath || "").replace(/\\/g, "/");
  const isBottomTabs = origin.includes("/@react-navigation/bottom-tabs/");
  const isScreenFallback =
    moduleName === "./ScreenFallback" ||
    moduleName === "./ScreenFallback.js" ||
    moduleName.endsWith("/views/ScreenFallback") ||
    moduleName.endsWith("/views/ScreenFallback.js");

  if (platform === "web" && isBottomTabs && isScreenFallback) {
    return {
      type: "sourceFile",
      filePath: path.resolve(projectRoot, "shims/navigation/ScreenFallback.tsx"),
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
