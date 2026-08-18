#!/usr/bin/env node
import { rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextCache = resolve(rootDir, "apps/web/.next");

rmSync(nextCache, { recursive: true, force: true });
console.log(`[dev:clean] Removed ${nextCache}`);
