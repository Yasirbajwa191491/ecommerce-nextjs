import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const expoCli = path.join(path.dirname(require.resolve("expo/package.json")), "bin", "cli");

const mobileDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "apps", "mobile");
const args = process.argv.slice(2);
const tunnel = args.includes("--tunnel");
const online = args.includes("--online");
const passthrough = args.filter((arg) => arg !== "--tunnel" && arg !== "--online");
const portIndex = passthrough.indexOf("--port");
const previewPort = portIndex >= 0 ? passthrough[portIndex + 1] : (passthrough.find((arg) => arg.startsWith("--port="))?.split("=")[1] ?? "8081");

function getWindowsWifiIp() {
  if (process.platform !== "win32") return null;
  try {
    const out = execSync("ipconfig", { encoding: "utf8" });
    const match = out.match(
      /Wireless LAN adapter Wi-Fi:[\s\S]*?IPv4 Address[^:\r\n]*:\s*([\d.]+)/i
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

const env = { ...process.env };
const wifiIp = getWindowsWifiIp();

if (wifiIp && !tunnel) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = wifiIp;
  console.log(`Expo Go URL will use Wi-Fi IP: ${wifiIp}`);
  console.log(`Manual entry in Expo Go: exp://${wifiIp}:${previewPort}`);
}

const expoArgs = [expoCli, "start"];
// Keep local preview memory reasonable on smaller laptops; callers can override.
if (!passthrough.some((arg) => arg === "--max-workers" || arg.startsWith("--max-workers="))) {
  expoArgs.push("--max-workers", "2");
}

if (tunnel) {
  expoArgs.push("--tunnel");
} else if (online) {
  expoArgs.push("--lan");
} else {
  // --offline skips expo.dev version checks; cannot combine with --lan in SDK 54.
  expoArgs.push("--offline");
}

expoArgs.push(...passthrough);

console.log(
  tunnel
    ? "Starting Expo with tunnel (slower, works across networks/firewalls)..."
    : "Starting Expo on LAN. Phone must be on the same Wi-Fi."
);

const child = spawn(process.execPath, expoArgs, {
  cwd: mobileDir,
  env,
  stdio: "inherit",
  shell: false,
  windowsHide: true,
});

child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
