import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  androidPackageNames,
  resolveGoogleServicesFile,
} from "@/lib/google-services-file.js";

const sampleJson = JSON.stringify({
  client: [
    {
      client_info: {
        android_client_info: { package_name: "com.yasir.ecommerce" },
      },
    },
  ],
});

describe("google services file resolution", () => {
  it("reads the Android package name", () => {
    expect(androidPackageNames(sampleJson)).toEqual(["com.yasir.ecommerce"]);
    expect(androidPackageNames("not-json")).toEqual([]);
  });

  it("uses a local google-services.json when present", () => {
    const appDir = mkdtempSync(path.join(tmpdir(), "google-services-"));
    const localPath = path.join(appDir, "google-services.json");
    writeFileSync(localPath, sampleJson);

    expect(
      resolveGoogleServicesFile({
        appDir,
        envValue: undefined,
        exists: (filePath: string) => filePath === localPath,
        writeFile: () => {
          throw new Error("should not write");
        },
      })
    ).toBe(localPath);
  });

  it("writes raw JSON from the build environment", () => {
    const appDir = mkdtempSync(path.join(tmpdir(), "google-services-env-"));
    const written: { filePath?: string; contents?: string } = {};

    const resolved = resolveGoogleServicesFile({
      appDir,
      envValue: sampleJson,
      exists: () => false,
      writeFile: (filePath: string, contents: string) => {
        written.filePath = filePath;
        written.contents = contents;
      },
    });

    expect(resolved).toBe(path.join(appDir, "google-services.json"));
    expect(written.contents).toBe(sampleJson);
  });

  it("uses an environment file path when the file exists", () => {
    const appDir = mkdtempSync(path.join(tmpdir(), "google-services-path-"));
    const secretPath = path.join(appDir, "secret.json");

    expect(
      resolveGoogleServicesFile({
        appDir,
        envValue: secretPath,
        exists: (filePath: string) => filePath === secretPath,
        writeFile: () => {
          throw new Error("should not write");
        },
      })
    ).toBe(secretPath);
  });

  it("stays disabled when no Firebase file is available", () => {
    expect(
      resolveGoogleServicesFile({
        appDir: path.join(tmpdir(), "missing-google-services"),
        envValue: undefined,
        exists: () => false,
        writeFile: () => {
          throw new Error("should not write");
        },
      })
    ).toBeNull();
  });
});
