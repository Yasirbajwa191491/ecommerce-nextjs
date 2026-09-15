#!/usr/bin/env node
/**
 * Validates Android push prerequisites before `eas build`.
 * Standalone APK push requires google-services.json + FCM credentials in EAS.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = path.join(root, "apps", "mobile");
const googleServicesPath = path.join(mobileDir, "google-services.json");
const appConfigPath = path.join(mobileDir, "app.config.ts");

const errors = [];
const warnings = [];

if (!fs.existsSync(googleServicesPath)) {
  errors.push(
    "Missing apps/mobile/google-services.json — download it from Firebase (Android app package: com.yasir.ecommerce)."
  );
} else {
  try {
    const json = JSON.parse(fs.readFileSync(googleServicesPath, "utf8"));
    const packageName = json?.client?.[0]?.client_info?.android_client_info?.package_name;
    if (packageName && packageName !== "com.yasir.ecommerce") {
      warnings.push(
        `google-services.json package is "${packageName}" but app.config.ts uses "com.yasir.ecommerce".`
      );
    }
  } catch {
    errors.push("apps/mobile/google-services.json is not valid JSON.");
  }
}

if (!fs.existsSync(appConfigPath)) {
  errors.push("Missing apps/mobile/app.config.ts");
}

if (errors.length > 0) {
  console.error("\nAndroid push validation failed:\n");
  for (const message of errors) {
    console.error(`  • ${message}`);
  }
  console.error("\nAfter adding Firebase files, also upload FCM V1 credentials in EAS:");
  console.error("  cd apps/mobile && eas credentials\n");
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("\nWarnings:\n");
  for (const message of warnings) {
    console.warn(`  • ${message}`);
  }
}

console.log("Android push files look OK locally.");
console.log("Ensure FCM V1 service account is uploaded in EAS, then rebuild the APK.");
