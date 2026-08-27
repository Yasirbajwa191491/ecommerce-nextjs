module.exports = function (api) {
  api.cache.using(() => process.env.EXPO_PUBLIC_CONVEX_URL ?? "");
  return {
    presets: ["babel-preset-expo"],
  };
};
