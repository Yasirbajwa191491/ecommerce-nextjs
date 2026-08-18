import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "apps", "mobile");
const args = process.argv.slice(2);
const tunnel = args.includes("--tunnel");
const online = args.includes("--online");
const passthrough = args.filter((arg) => arg !== "--tunnel" && arg !== "--online");

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
  console.log(`Manual entry in Expo Go: exp://${wifiIp}:8081`);
}

const expoArgs = ["expo", "start"];

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

const child = spawn("npx", expoArgs, {
  cwd: mobileDir,
  env,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
