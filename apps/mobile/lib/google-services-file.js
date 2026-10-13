const path = require("node:path");

const LOCAL_FILE_NAME = "google-services.json";

function androidPackageNames(contents) {
  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return [];
  }

  return (parsed.client ?? [])
    .map((client) => client.client_info?.android_client_info?.package_name)
    .filter((packageName) => Boolean(packageName));
}

/**
 * Local google-services.json, or GOOGLE_SERVICES_JSON from EAS (file path or raw JSON).
 * Returns null when Android push credentials were not provided for this build.
 */
function resolveGoogleServicesFile(args) {
  const localPath = path.join(args.appDir, LOCAL_FILE_NAME);
  const envValue = args.envValue?.trim();

  if (envValue?.startsWith("{")) {
    args.writeFile(localPath, envValue);
    return localPath;
  }

  if (envValue && args.exists(envValue)) {
    return envValue;
  }

  if (args.exists(localPath)) {
    return localPath;
  }

  return null;
}

module.exports = {
  androidPackageNames,
  resolveGoogleServicesFile,
};
